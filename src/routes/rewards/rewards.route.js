const express = require("express");
const {
  validateRewardCreation,
  validatePlayerRewardClaim,
} = require("../../validations/validations");
const {
  createReward,
  claimReward,
} = require("../../controllers/rewards/reward.controller");
const router = express.Router();

router.post("/create", validateRewardCreation, createReward);
router.post("/:rewardId/claim", validatePlayerRewardClaim, claimReward);

module.exports = router;
