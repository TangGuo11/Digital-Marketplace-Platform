//payment-system/utils/sign.js
const crypto = require("crypto");

exports.md5 = (str) => {
  return crypto.createHash("md5")
    .update(String(str))
    .digest("hex");
};