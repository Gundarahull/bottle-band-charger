const express = require("express");
const { validatePlayerCredit } = require("../../validations/validations");
const {
  creditAmount,
} = require("../../controllers/wallets/wallets.controller");
const router = express.Router();

router.post("/:playerId/credit", validatePlayerCredit, creditAmount);

module.exports = router;
