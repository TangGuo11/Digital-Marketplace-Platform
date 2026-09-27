// payment-system/config.js
require('dotenv').config();

module.exports = {
  PORT: process.env.PAYMENT_PORT || 3003,

  // 支付系统接口地址
  PAY_API: process.env.PAY_API || "http://127.0.0.1:3001/createOrder",
  PAY_KEY: process.env.PAY_KEY || "your_pay_key_here",
  SHOP_API: process.env.SHOP_API || "http://127.0.0.1:3000",
  DOMAIN: process.env.DOMAIN || "http://127.0.0.1:3000",

  // 数据库连接串
  MONGO_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/shop"
};