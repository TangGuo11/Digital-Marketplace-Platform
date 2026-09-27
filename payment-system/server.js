// /root/WDSJSD/payment-system/server.js
const express = require("express");
const config = require("./config");

const app = express();

app.use(express.json());
app.use(express.static("public"));

app.use("/api/pay", require("./routes/pay"));

// ⭐ 修改：提示当前是集成模式，或者直接注释掉 listen
console.log("⚠️ 支付系统已集成到主项目 (端口 3000)，请勿独立启动此服务");

// 如果需要保留独立启动能力，可以保留以下代码，但默认端口改为 3003
// const PORT = config.PORT || 3003;
// app.listen(PORT, () => {
//   console.log("Server running:", PORT);
// });