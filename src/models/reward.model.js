const { DataTypes } = require("sequelize");
const connectDB = require("../config/dbConfig");

const Reward = connectDB.define(
  "reward",
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  { timestamps: true, underscored: true, tableName: "rewards" },
);

module.exports = Reward;
