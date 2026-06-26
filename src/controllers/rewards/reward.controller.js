const { validationResult } = require("express-validator");
const { v4: uuidv4 } = require("uuid");
const Reward = require("../../models/reward.model");
const Player = require("../../models/player.model");
const Reward_Player = require("../../models/rewardsPlayer.model");
const connectDB = require("../../config/dbConfig");
const Done_Requests = require("../../models/doneRequests.model");

const createReward = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation Failed",
        errors: errors.array(),
      });
    }

    const { name } = req.body;

    const generatedRewardId = uuidv4();

    const newReward = await Reward.create({
      id: generatedRewardId,
      name: name.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Reward added successfully",
      data: newReward,
    });
  } catch (error) {
    console.error("Error------------", error);
    return res.status(500).json({
      success: false,
      message: "Error at createReward controller",
      error: error.message || error,
    });
  }
};

const claimReward = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation Failed",
        errors: errors.array(),
      });
    }

    const { rewardId } = req.params;
    const { playerId } = req.body;
    const strPlayerId = String(playerId);
    const strRewardId = String(rewardId);

    const code = `claim:${strPlayerId}:${strRewardId}`;

    const result = await connectDB.transaction(async (trans) => {
      const isRequestExisted = await Done_Requests.findByPk(code, {
        transaction: trans,
      });
      if (isRequestExisted) {
        
        return {
          status: 200,
          success: true,
          message: isRequestExisted.response_body.message,
          data: {
            rewardId: isRequestExisted.response_body.rewardId,
            claimedAt: isRequestExisted.response_body.claimedAt,
          },
        };
      }

      const player = await Player.findByPk(strPlayerId, { transaction: trans });
      if (!player) {
        return {
          status: 404,
          success: false,
          message: "Player does not exist",
          data:null
        };
      }

      const reward = await Reward.findByPk(strRewardId, { transaction: trans });
      if (!reward) {
        return {
          status: 404,
          success: false,
          message: "Reward does not exist",
          data:null
        };
      }

      //Checking the reward is already claimed or not
      const isRewardAlreadyClaimed = await Reward_Player.findOne({
        where: { player_id: strPlayerId, reward_id: strRewardId },
        transaction: trans,
        lock: trans.LOCK.UPDATE,
      });

      if (isRewardAlreadyClaimed) {
        return {
          status: 409,
          success: false,
          message: "Player already claimed the Reward",
          data:null
        };
      }

      //insering the record
      await Reward_Player.create(
        {
          player_id: strPlayerId,
          reward_id: strRewardId,
        },
        { transaction: trans },
      );

      const successPayload = {
        message: "Reward claimed successfully",
        rewardId: strRewardId,
        claimedAt: new Date(),
      };

      await Done_Requests.create(
        {
          code: code,
          status_code: 200,
          response_body: successPayload,
        },
        { transaction: trans },
      );

      return {
        status: 200,
        success: true,
        message: successPayload.message,
        data: {
          rewardId: successPayload.rewardId,
          claimedAt: successPayload.claimedAt,
        },
      };
    });
    

    return res.status(result.status).json({
      success: result.success,
      message: result.message,
      data: result.data,
    });
  } catch (error) {
    console.error("Error------------", error);
    return res.status(500).json({
      success: false,
      message: "Error at claimReward controller",
      error: error.message || error,
    });
  }
};

module.exports = {
  createReward,
  claimReward
};
