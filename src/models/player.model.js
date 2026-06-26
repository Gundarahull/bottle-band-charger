const { DataTypes } = require("sequelize");
const connectDB = require("../config/dbConfig");

const Player = connectDB.define(
  "player",
  {
    id: {
      type: DataTypes.STRING,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
  },
  { underscored: true, timestamps: true, tableName: "players" },
);

module.exports = Player;
