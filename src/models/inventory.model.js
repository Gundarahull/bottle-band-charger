const { DataTypes } = require("sequelize");
const connectDB = require("../config/dbConfig");

const Inventory = connectDB.define(
  "inventory",
  {
    id: {
      type: DataTypes.STRING,
      defaultValue: DataTypes.STRING,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
  },
  { underscored: true, timestamps: true, tableName: "inventories" },
);

module.exports = Inventory;
