const { body } = require("express-validator");

const validatePlayerCredit = [
  body("amount")
    .exists()
    .withMessage("Amount is required")
    .notEmpty()
    .withMessage("Amount cannot be empty")
    .isInt({ min: 1 })
    .withMessage("Amount must be a whole integer greater than 0"),

  body("reason")
    .exists()
    .withMessage("Reason is required")
    .notEmpty()
    .withMessage("Reason cannot be empty")
    .isString()
    .withMessage("Reason must be a valid string")
    .trim()
    .isLength({ min: 3 })
    .withMessage("Reason must be at least 3 characters long"),
];

const validatePlayerPurchaseItem = [
  body("price")
    .exists()
    .withMessage("Price is required")
    .notEmpty()
    .withMessage("Price cannot be empty")
    .isInt({ min: 1 })
    .withMessage("Price must be a whole integer greater than 0"),

  body("itemId")
    .exists()
    .withMessage("ItemId is required")
    .notEmpty()
    .withMessage("ItemId cannot be empty")
    .isString()
    .withMessage("ItemId must be a valid string")
    .trim()
    .isLength({ min: 1 })
    .withMessage("ItemId cannot be empty"),
];

const validatePlayerRewardClaim = [
  body("playerId")
    .exists()
    .withMessage("PlayerId is required")
    .notEmpty()
    .withMessage("PlayerId cannot be empty")
    .isString()
    .withMessage("PlayerId must be a valid string")
    .trim()
    .isLength({ min: 1 })
    .withMessage("PlayerId cannot be empty"),
];

module.exports = {
  validatePlayerCredit,
  validatePlayerPurchaseItem,
  validatePlayerRewardClaim,
};
