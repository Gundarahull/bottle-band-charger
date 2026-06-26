const { DataTypes } = require("sequelize");
const connectDB = require("../config/dbConfig");

const Done_Requests = connectDB.define(
  "done_request",
  {
    code: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    status_code: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    response_body:{
        type:DataTypes.JSONB,
        allowNull:false
    }
  },
  {
    underscored: true,
    timestamps: true,
    tableName: "done_requests",
  },
);

module.exports = Done_Requests;
