const cron = require("node-cron");
const fetchOrderData = require("./services/orderService");

cron.schedule("*/10 * * * *", () => {
  console.log("Running the cron job every 10 minute...");
  fetchOrderData()
    .then(() => console.log("Data fetched and processed."))
    .catch((error) => console.log("Error during data fetching:", error));
});