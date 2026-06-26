module.exports = {
  SERVER_PORT: process.env.PORT,
  POSTGRE_SQL: {
    PORT: process.env.POSTGRE_SQL_PORT,
    USERNAME: process.env.POSTGRE_SQL_USERNAME,
    PASSWORD: process.env.POSTGRE_SQL_PASSWORD,
    DATA_BASE_NAME: process.env.POSTGRE_SQL_DATABASE_NAME,
    HOST: process.env.POSTGRE_SQL_HOST,
  },
};
