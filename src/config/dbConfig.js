const { Sequelize } = require("sequelize");
const { POSTGRE_SQL } = require("./env");
require("dotenv").config();

const connectDB = new Sequelize(
  process.env.POSTGRE_SQL_DATABASE_NAME,
  process.env.POSTGRE_SQL_USERNAME,
  process.env.POSTGRE_SQL_PASSWORD,
  {
    host: "localhost",
    port: process.env.POSTGRE_SQL_PORT || 5432,
    dialect: "postgres",
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000, //for sleeping connection
    },
  },
);

module.exports = connectDB;
