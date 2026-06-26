require("dotenv").config(); //configing the ENV
const express = require("express");
const { SERVER_PORT } = require("./config/env");
const connectDB = require("./config/dbConfig");
const app = express();
const PORT = SERVER_PORT;

app.use(express.json()); //middleware parsing the request JSONbody
app.use(express.urlencoded({ extended: true })); //pasting the body(data) for FORM_DATA

//Middleware to get the REQUESTS
app.use((req, res, next) => {
  console.log(`Request URL : ${req.url} with Request METHOD : ${req.method}`);
  console.log(`Request BODY : ${JSON.stringify(req.body)}`);
  next();
});

//Connecting-DATABASE
connectDB
  .authenticate()
  .then(() => {
    console.log("PostgreSQL connected Succesfully.");
  })
  .catch((err) => {
    console.log("Error while connecting to PostgreSQL ", err);
  });

connectDB
  .sync({ alter: false }) //alter keeps data and Columns updated
  .then(() => {
    console.log("Tables Created");
  })
  .catch((err) => {
    console.log("Error while creating table ", err);
  }); 

app.listen(PORT, () => {
  console.log(`Server is listening at ${PORT}`);
});
