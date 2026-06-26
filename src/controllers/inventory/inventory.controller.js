const { validationResult } = require("express-validator");
const { v4: uuidv4 } = require("uuid"); 
const Inventory = require("../../models/inventory.model");

const createInventoryItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation Failed",
        errors: errors.array(),
      });
    }

    const { name } = req.body;

    const generatedItemId = uuidv4();

    const newItem = await Inventory.create({
      id: generatedItemId,
      name: name.trim(),
    });

    return res.status(201).json({
      success: true,
      message: "Item Added successfully",
      data: newItem,
    });

  }  catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error at CreateINventoryItem controller",
      error: error.message || error,
    });
  }
};

module.exports = {
  createInventoryItem,
};