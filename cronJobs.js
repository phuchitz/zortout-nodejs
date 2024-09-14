const cron = require("node-cron");
const fetchOrderData = require("./services/orderService");

console.log('Cron job script loaded'); 

cron.schedule("*/10 * * * *", () => {
  console.log("Running the cron job every 10 minute...");
  fetchOrderData()
    .then(() => console.log("Data fetched and processed."))
    .catch((error) => console.log("Error during data fetching:", error));
});
