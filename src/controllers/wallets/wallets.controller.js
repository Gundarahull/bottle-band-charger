const { validationResult } = require("express-validator");
const Player = require("../../models/player.model");
const connectDB = require("../../config/dbConfig");
const Done_Requests = require("../../models/doneRequests.model");
const Wallet = require("../../models/wallet.model");
const Inventory = require("../../models/inventory.model");
const Player_Purchase_Inventory = require("../../models/playerPurchaseInventory.model");
const { QueryTypes } = require("sequelize");

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

const getWalletBalance = async (req, res) => {
  try {
    const { playerId } = req.params;
    if (!playerId) {
      return res.status(400).json({
        success: false,
        message: "Please send the PlayerID",
      });
    }
    const strPlayerId = String(playerId).trim();

    // RAW SQL Query to fetch rewards, inventories
    const query = `
      SELECT 
        p.id AS player_id,
        p.name as player_name,
        COALESCE(w.balance, 0) AS balance,
        ppi.inventory_id,
        i.name AS item_name,
        ppi.quantity,
        rp.reward_id,
        r.name AS reward_name
      FROM players p
      LEFT JOIN wallet w ON p.id = w.player_id
      LEFT JOIN players_purchases_inventories ppi ON p.id = ppi.player_id
      LEFT JOIN inventories i ON ppi.inventory_id = i.id
      LEFT JOIN rewards_players rp ON p.id = rp.player_id
      LEFT JOIN rewards r ON rp.reward_id = r.id
      WHERE p.id = :playerId
    `;

    const rows = await connectDB.query(query, {
      replacements: { playerId: strPlayerId }, //to avoid sql injections
      type: QueryTypes.SELECT,
    });

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Player does not exist",
      });
    }

    const balance = Number(rows[0].balance);

    const inventoryMap = new Map();
    const uniqueRewardsMap = new Map();

    for (const row of rows) {
      //making unique for inventory
      if (row.inventory_id) {
        if (!inventoryMap.has(row.inventory_id)) {
          inventoryMap.set(row.inventory_id, {
            itemId: row.inventory_id,
            name: row.item_name,
            quantity: Number(row.quantity),
          });
        }
      }

      // making unique for Rewards
      if (row.reward_id) {
        if (!uniqueRewardsMap.has(row.reward_id)) {
          uniqueRewardsMap.set(row.reward_id, {
            rewardId: row.reward_id,
            name: row.reward_name,
          });
        }
      }
    }

    // converting maps into arrays
    const inventoryArray = Array.from(inventoryMap.values());
    const rewardsArray = Array.from(uniqueRewardsMap.values());

    return res.status(200).json({
      success: true,
      balance: balance,
      inventory: inventoryArray,
      claimedRewards: rewardsArray,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error at getWalletBalance controller",
      error: error.message || error,
    });
  }
};

module.exports = {
  creditAmount,
  purchaseItem,
  getWalletBalance,
};
