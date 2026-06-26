const express = require("express");
const { validateInventoryCreation } = require("../../validations/validations");
const {
  createInventoryItem,
} = require("../../controllers/inventory/inventory.controller");

const router = express.Router();

router.post("/create", validateInventoryCreation, createInventoryItem);

module.exports = router;
