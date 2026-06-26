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

const validatePlayerCreation = [
  body("name")
    .exists()
    .withMessage("Player name is required")
    .notEmpty()
    .withMessage("Player name cannot be empty")
    .isString()
    .withMessage("Player name must be a string")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters long"),
];

const validateInventoryCreation = [
  body("name")
    .exists()
    .withMessage("Item name is required")
    .notEmpty()
    .withMessage("Item name cannot be empty")
    .isString()
    .withMessage("Item name must be a valid string")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Item name must be between 2 and 50 characters long"),
];

module.exports = {
  validatePlayerCredit,
  validatePlayerPurchaseItem,
  validatePlayerRewardClaim,
  validatePlayerCreation,
  validateInventoryCreation,
};
