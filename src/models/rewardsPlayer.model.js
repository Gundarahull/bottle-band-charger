const { DataTypes } = require("sequelize");
const connectDB = require("../config/dbConfig");

const Reward_Player = connectDB.define(
  "reward_player",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    player_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: {
          tableName: "players",
        },
        key: "id",
      },
    },
    reward_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: {
          tableName: "rewards",
        },
        key: "id",
      },
    },
  },
  {
    underscored: true,
    timestamps: true,
    tableName: "rewards_players",
    indexes: [
      {
        unique: true,
        fields: ["player_id", "reward_id"],
      },
    ],
  },
);

module.exports = Reward_Player;
