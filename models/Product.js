// models/Product.js - 上传作品数据模型
const mongoose = require("mongoose")

const MediaSchema = new mongoose.Schema({

  type: {
    type: String,
    enum: ["image", "video"],
    required: true
  },

  url: {
    type: String,
    required: true
  },

  order: {
    type: Number,
    default: 0
  }

})

const ProductSchema = new mongoose.Schema({

  title: {
    type: String,
    required: true
  },

  price: {
    type: Number,
    required: true
  },

  /** 积分兑换价格，设置后可用积分兑换 */
  pointsPrice: {
    type: Number,
    default: null,
    min: 0
  },

  description: {
    type: String,
    default: ""
  },

  // ⭐ 新增：B站视频链接
  bilibiliUrl: {
    type: String,
    default: ""
  },

  media: [MediaSchema],

  createdAt: {
    type: Date,
    default: Date.now
  }

})

module.exports = mongoose.model("Product", ProductSchema)