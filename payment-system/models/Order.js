// payment-system/models/Order.js

const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({

  /* =====================================================
     本地订单信息
  ===================================================== */

  payId: {
    type: String,
    unique: true,
    index: true
  },

  orderId: {
    type: String,
    index: true
  },

  thirdOrderId: String, // 第三方订单号（支付平台）


  /* =====================================================
     商品信息
  ===================================================== */

  productId: {
    type: String,
    index: true
  },

  productName: String,


  /* =====================================================
     用户信息（可扩展）
  ===================================================== */

  userId: String,


  /* =====================================================
     金额信息
  ===================================================== */

  price: Number,        // 商品价格
  reallyPrice: Number,  // 实际支付金额


  /* =====================================================
     支付信息
  ===================================================== */

  payType: Number,      // 1=微信 2=支付宝
  payUrl: String,       // 支付二维码URL

  status: {
    type: String,
    enum: ["pending", "paid", "expired"],
    default: "pending",
    index: true
  },

/*----- 订单类型分类 ------*/
orderType: {
  type: String,
  enum: ["product", "custom", "points"],
  default: "product",
  index: true
},

  pointsUsed: {
    type: Number,
    default: 0
  },

  /* 委托诚意金：完整表单仅存本地，支付平台 param 只传短字符串 */
  customPayload: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },


  /* =====================================================
     ⭐ 用户提交资料（新增）
  ===================================================== */

  contactType: {
    type: String,
    enum: ["wechat", "qq"],
    default: null
  },

  contactValue: {
    type: String,
    default: null,
    index: true
  },

  serverAccount: {
    type: String,
    default: null
  },

  serverPassword: {
    type: String,
    default: null
  },

  submitAt: Date,


  /* =====================================================
     ⭐ 工单处理状态（新增）
  ===================================================== */

  finished: {
    type: Boolean,
    default: false,
    index: true
  },

  finishedAt: Date,


  /* =====================================================
     发货状态
  ===================================================== */

  delivered: {
    type: Boolean,
    default: false,
    index: true
  },


  /* =====================================================
     时间信息
  ===================================================== */

  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  paidAt: Date,

  expireAt: Date

});


/* =====================================================
   自动索引优化（后台查询会非常快）
===================================================== */

// 查询待处理订单（核心索引）
OrderSchema.index({
  status: 1,
  finished: 1,
  delivered: 1
});

// 用户联系查询
OrderSchema.index({
  contactValue: 1,
  createdAt: -1
});


module.exports = mongoose.model("Order", OrderSchema);