const express = require("express");
const { validateRewardCreation } = require("../../validations/validations");
const { createReward } = require("../../controllers/rewards/reward.controller");
const router = express.Router();

router.post("/create", validateRewardCreation,createReward);

module.exports = router;
