const { validationResult } = require("express-validator");
const Player = require("../../models/player.model");
const connectDB = require("../../config/dbConfig");
const Done_Requests = require("../../models/doneRequests.model");
const Wallet = require("../../models/wallet.model");
const Inventory = require("../../models/inventory.model");
const Player_Purchase_Inventory = require("../../models/playerPurchaseInventory.model");

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
    const strPlayerId = String(playerId);

    const item = await Inventory.findByPk(itemId);
    if (!item) {
      return res.status(400).json({
        success: false,
        message: "Item Doesnt Exist",
      });
    }

    const player = await Player.findByPk(strPlayerId);
    if (!player) {
      return res.status(400).json({
        success: false,
        message: "Player Doesnt Exist",
      });
    }

    const result = await connectDB.transaction(async (trans) => {
      const isAlreadyPurchased = await Player_Purchase_Inventory.findOne({
        where: { player_id: strPlayerId, inventory_id: itemId },
        transaction: trans,
        lock: trans.LOCK.UPDATE,
      });

      let currentQuantity;
      if (isAlreadyPurchased) {
        currentQuantity = Number(isAlreadyPurchased.quantity);
      } else {
        currentQuantity = 0;
      }
      const nextSequence = currentQuantity + 1;

      const code = `purchase:${strPlayerId}:${itemId}:${nextSequence}`;

      const isRequestExisted = await Done_Requests.findByPk(code, {
        transaction: trans,
      });
      if (isRequestExisted) {
        return {
          status: isRequestExisted.status_code,
          success: true,
          message: isRequestExisted.response_body.message,
          data: {
            itemId: isRequestExisted.itemId,
            remainingBalance: isRequestExisted.response_body.remainingBalance,
            quantity: isRequestExisted.response_body.quantity,
          },
        };
      }

      //Fetch the amount in wallet
      const walletAmount = await Wallet.findOne({
        where: {
          player_id: strPlayerId,
        },
        transaction: trans,
        lock: trans.LOCK.UPDATE,
      });

      if (!walletAmount) {
        return {
          status: 404,
          success: false,
          message: "No Money in the wallet, Please deposit ",
          data: null,
        };
      }

      if (walletAmount.balance < price) {
        return {
          status: 400,
          success: false,
          message: "Insufiicent Funds",
          data: walletAmount.balance,
        };
      }
      //deducting the money from wallet
      walletAmount.balance = walletAmount.balance - price;
      await walletAmount.save({ transaction: trans });

      //adding the inventory to the player_id
      let firstPurchased;
      let firstPurchasedDetails;
      if (currentQuantity === 0) {
        const Purchased_inventory = await Player_Purchase_Inventory.create(
          {
            player_id: strPlayerId,
            inventory_id: itemId,
            quantity: 1,
          },
          { transaction: trans },
        );
        if (Purchased_inventory) {
          firstPurchased = true;
          firstPurchasedDetails = Purchased_inventory;
        }
      } else {
        isAlreadyPurchased.quantity = nextSequence;
        await isAlreadyPurchased.save({ transaction: trans });
      }

      const successPayload = {
        message: "Item Purchased successfully",
        itemId: itemId,
        remainingBalance: walletAmount.balance,
        quantity: firstPurchased
          ? firstPurchasedDetails.quantity
          : isAlreadyPurchased.quantity,
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
          itemId: successPayload.itemId,
          remainingBalance: successPayload.remainingBalance,
          quantity: successPayload.quantity,
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
      message: "Error at purchaseItem controller",
      error: error.message || error,
    });
  }
};

module.exports = {
  creditAmount,
  purchaseItem,
};
