const { validationResult } = require("express-validator");
const { v4: uuidv4 } = require("uuid"); 
const Reward = require("../../models/reward.model");

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
      data:newReward,
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

module.exports = {
  createReward,
};