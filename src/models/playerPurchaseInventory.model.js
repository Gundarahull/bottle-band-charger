const { DataTypes,Op } = require("sequelize");
const connectDB = require("../config/dbConfig");

const Player_Purchase_Inventory = connectDB.define(
  "player_purchase_inventory",
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
    inventory_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: {
          tableName: "inventories",
        },
        key: "id",
      },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    underscored: true,
    timestamps: true,
    tableName: "players_purchases_inventories",
    indexes: [
      {
        name: "inventory_quantity_check",
        fields: ["quantity"],
        where: {
          quantity: { [Op.gt]: 0 },
        },
      },
    ],
  },
);

module.exports = Player_Purchase_Inventory;
