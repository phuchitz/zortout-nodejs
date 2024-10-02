const axios = require("axios");
const ProcessedOrder = require("../models/ProcessedOrder");
const getAccessToken = require("./tokenService");
const logger = require("../logger");

async function fetchOrderData() {
  const accessToken = await getAccessToken();
  const url = "https://order.bentoweb.com/api/order/list/35022";

  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (response.data.status === 1) {
      const orderList = response.data.data.order_list;

      for (const order of orderList) {
        if (order.is_paid) {
          const orderDetailUrl = `https://order.bentoweb.com/api/order/order-full/${order.order_id}`;

          try {
            const existingOrder = await ProcessedOrder.findOne({
              orderId: order.order_id.toString(),
            });

            if (existingOrder) {
              logger.info(`Order ID ${order.order_id} already processed.`);
              console.log(`Order ID ${order.order_id} already processed.`);
            } else {
              logger.info(`Processing new Order ID ${order.order_id}`);
              console.log(`Processing new Order ID ${order.order_id}`);

              const newProcessedOrder = new ProcessedOrder({
                orderId: order.order_id.toString(),
              });
              await newProcessedOrder.save();

              const detailResponse = await axios.get(orderDetailUrl, {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  Accept: "application/json",
                },
              });

              if (detailResponse.data.status === 1) {
                const zortout_Url = `https://open-api.zortout.com/v4/Order/AddOrder`;

                const getProductsUrl =
                  "https://open-api.zortout.com/v4/Product/GetProducts";

                const skuLists = detailResponse.data.data.order.order_item.map(
                  (item, index) => item.sku
                );

                const skuBundleLists =
                  detailResponse.data.data.order.order_item.map(
                    (item, index) => {
                      if (item.sku.includes("-")) {
                        return item.sku;
                      }
                    }
                  );

                /* GET SKU ZORTOUT LIST START */
                const responseSkuItem = await axios.get(getProductsUrl, {
                  headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    storename: process.env.STORENAME,
                    apikey: process.env.API_KEY,
                    apisecret: process.env.API_SECRET,
                    skulist: skuLists.join(","),
                  },
                });
                /* GET SKU ZORTOUT LIST END */

                try {
                  const zortoutPayload = {
                    shippingaddress:
                      detailResponse.data.data.order.shipping_address_1,
                    shippingemail:
                      detailResponse.data.data.order.shipping_email,
                    status: "Success",
                    paymentstatus: "Paid",
                    customername: `${detailResponse.data.data.order.full_order_code} : ${detailResponse.data.data.order.firstname} ${detailResponse.data.data.order.lastname}`,
                    customerphone:
                      detailResponse.data.data.order.shipping_phone,
                    amount: parseFloat(order.grand_total),
                    shippingamount: parseFloat(
                      detailResponse.data.data.order.shipping
                    ),
                    paymentamount: detailResponse.data.data.order.grand_total,
                    paymentmethod:
                      detailResponse.data.data.order.payment_method,
                    paymentdate:
                      detailResponse.data.data.order.payment_datetime,
                    /* MAPPING PRODUCT LIST START */
                    list: detailResponse.data.data.order.order_item.map(
                      async (item, index) => {
                        const productBySku = responseSkuItem.data.list.find(
                          (findSku, index) => findSku.sku === item.sku
                        );
                        let skuBundleResponse = null;
                        if (skuBundleLists) {
                          const hasSkuBundle = skuBundleLists.find(
                            (findBundle, index) => findBundle.sku === item.sku
                          );
                          /* GET SKU BUNDLE ZORTOUT LIST START */
                          const responseSkuItem = await axios.get(
                            `https://open-api.zortout.com/v4/Bundle/GetBundles?keyword=${hasSkuBundle}`,
                            {
                              headers: {
                                Accept: "application/json",
                                "Content-Type": "application/json",
                                storename: process.env.STORENAME,
                                apikey: process.env.API_KEY,
                                apisecret: process.env.API_SECRET,
                              },
                            }
                          );
                          skuBundleResponse = responseSkuItem.data.list[0];
                          /* GET SKU BUNDLE ZORTOUT LIST END */
                        }
                        return {
                          sku: item.sku,
                          name: skuBundleResponse
                            ? skuBundleResponse.name
                            : productBySku.name,
                          number: parseFloat(item.qty.toString()),
                          pricepernumber: skuBundleResponse
                            ? parseFloat(skuBundleResponse.sellprice)
                            : parseFloat(productBySku.sellprice),
                          discount: "0",
                          totalprice: parseFloat(item.total.toString()),
                        };
                      }
                    ),
                    /* MAPPING PRODUCT LIST END */
                  };

                  /* ADD ORDER TO ZORTOUT START */
                  const zortoutResponse = await axios.post(
                    zortout_Url,
                    zortoutPayload,
                    {
                      headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        storename: process.env.STORENAME,
                        apikey: process.env.API_KEY,
                        apisecret: process.env.API_SECRET,
                      },
                    }
                  );
                  console.log(`Zortout API response: `, zortoutResponse.data);
                  /* ADD ORDER TO ZORTOUT END */
                } catch (error) {
                  console.error(
                    "Error zortout API:",
                    error.response ? error.response.data : error.message
                  );
                }
              } else {
                console.error(
                  `Error: Failed to fetch order details. Response status: ${detailResponse.data.status}`
                );
              }
            }
          } catch (error) {
            logger.error("Error fetching order detail:", error);
            console.error(
              "Error processing order detail:",
              error.response ? error.response.data : error.message
            );
          }
        }
      }
    } else {
      console.error(
        `Error: Failed to fetch order list. Response status: ${response.data.status}`
      );
    }
  } catch (error) {
    logger.error("Error fetching order data:", error);
    console.error(
      "Error fetching order data:",
      error.response ? error.response.data : error.message
    );
  }
}

module.exports = fetchOrderData;
