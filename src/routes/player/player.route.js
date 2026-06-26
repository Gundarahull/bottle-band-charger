const express = require("express");
const { createPlayer } = require("../../controllers/player/player.controller");
const { validatePlayerCreation } = require("../../validations/validations");
const router = express.Router();

router.post("/create", validatePlayerCreation, createPlayer);

module.exports = router;
