const express = require("express");
const { validatePlayerCredit, validatePlayerPurchaseItem } = require("../../validations/validations");
const {
  creditAmount,
  purchaseItem,
} = require("../../controllers/wallets/wallets.controller");
const router = express.Router();

router.post("/:playerId/credit", validatePlayerCredit, creditAmount);
router.post("/:playerId/purchase", validatePlayerPurchaseItem, purchaseItem);

module.exports = router;
