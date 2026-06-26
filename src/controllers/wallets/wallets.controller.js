const { validationResult } = require("express-validator");
const Player = require("../../models/player.model");
const connectDB = require("../../config/dbConfig");
const Done_Requests = require("../../models/doneRequests.model");
const Wallet = require("../../models/wallet.model");

const creditAmount = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation Failed",
        errors: errors.array(),
      });
    }

    const { playerId } = req.params;
    const { amount, reason } = req.body;

    //Assuming the reason should be differ from while depositing and winning amount
    //eg: deposist : depoist_invoice_12345
    //eg: winningAmount : won_game_90876

    const strPlayerId = String(playerId);

    const player = await Player.findByPk(strPlayerId);
    if (!player) {
      return res.status(400).json({
        success: false,
        message: "Player Doesnt Exist",
      });
    }

    const code = `code:${strPlayerId}:${reason.trim()}`;

    //applying the Transcations
    const result = await connectDB.transaction(async (trans) => {
      const isRequestExisted = await Done_Requests.findByPk(code, {
        transaction: trans,
      });
      if (isRequestExisted) {
        return {
          status: isRequestExisted.status_code,
          success: true,
          message: isRequestExisted.response_body,
        };
      }

      const [wallet] = await Wallet.findOrCreate({
        where: { player_id: strPlayerId },
        defaults: { balance: 0 },
        transaction: trans,
        lock: trans.LOCK.UPDATE, //ROW-Lowel Lock which will prevents the RACE CONDITIONS
      });

      wallet.balance = wallet.balance + amount;
      await wallet.save({ transaction: trans });

      const successReponse = {
        balance: wallet.balance,
        success: true,
      };

      //Save the SuccessRequests after crediting the amount
      await Done_Requests.create(
        {
          code: code,
          status_code: 200,
          response_body: successReponse,
        },
        { transaction: trans },
      );

      return {
        status: 200,
        success: true,
        message: successReponse,
      };
    });

    return res.status(result.status).json({
      success: result.success,
      message: "Amount Credited Succesfully",
      data: { totalAmount: result.message.balance },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error at CreditAmount controller",
      error: error.message || error,
    });
  }
};

const purchaseItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation Failed",
        errors: errors.array(),
      });
    }

    const { playerId } = req.params;
    const { itemId, price } = req.body;
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error at purchaseItem controller",
      error: error.message || error,
    });
  }
};

module.exports = {
  creditAmount,
};
