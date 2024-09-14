const express = require("express");
const connectDB = require("./config/db");
require("dotenv").config();

require("./cronJobs");

const app = express();
const port = process.env.PORT || 3030;

connectDB();

app.get("/", (req, res) => {
  res.send("Server is running!");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});