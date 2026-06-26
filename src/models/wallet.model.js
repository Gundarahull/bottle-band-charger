const { DataTypes, Op } = require("sequelize");
const connectDB = require("../config/dbConfig");

const Wallet = connectDB.define(
  "wallet",
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
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    balance: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    underscored: true,
    timestamps: true,
    tableName: "wallet",
    indexes: [
      {
        name: "wallet_balance_check",
        fields: ["balance"],
        where: {
          balance: { [Op.gt]: 0 }, 
        },
      },
    ],
  },
);

module.exports = Wallet;