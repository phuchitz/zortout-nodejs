const express = require("express");
const connectDB = require("./config/db");
const fetchOrderData = require("./services/orderService");
require("dotenv").config();

require("./cronJobs");

const app = express();
const port = process.env.PORT || 3030;

connectDB();

app.get("/fetch-orders", async (req, res) => {
  try {
    await fetchOrderData();
    res.send("Data fetched and processed.");
  } catch (error) {
    res.status(500).send("Error during data fetching.");
  }
});

app.get("/", (req, res) => {
  res.send("Server is running !!!");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
