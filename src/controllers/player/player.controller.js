const { v4: uuidv4 } = require("uuid");
const Player = require("../../models/player.model");
const { validationResult } = require("express-validator");
const createPlayer = async (req, res) => {
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

    // Create the Player
    const generatedPlayerId = uuidv4();
    const newPlayer = await Player.create({
      id: generatedPlayerId,
      name: name.trim(),
    });

    return res.status(200).json({
      success: true,
      message: "Player created Succesfully",
      data: newPlayer,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error at CreatePlayer controller",
      error: error.message || error,
    });
  }
};
module.exports = {
  createPlayer,
};
