// /root/WDSJSD/custom-system/models/CustomOrder.js 作品定制数据模型
const mongoose = require("mongoose")

const customOrderSchema = new mongoose.Schema({
  userId: {
    type: String,
    default: null,
    index: true
  },

  // 用户提交的信息
  contact: {
    type: String,
    required: true
  },
  contactType: {
    type: String,
    enum: ["qq", "wechat"],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000  // 增加长度限制
  },
  budget: {
    type: Number,
    required: true
  },

  // 状态管理（重要变更）
  status: {
    type: String,
    enum: ["pending", "accepted", "completed", "rejected"],
    default: "pending",
    index: true
  },

  // 支付信息
  payOrderId: {
    type: String,
    required: true,  // 支付后才有委托单，所以必填
    unique: true
  },
  depositAmount: {
    type: Number,
    default: 5
  },

  // 管理员操作记录
  acceptedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  rejectedAt: {
    type: Date
  },
  rejectedReason: {
    type: String,
    default: null
  },

  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }

}, {
  versionKey: false
})

// 索引优化
customOrderSchema.index({ status: 1, createdAt: -1 })
customOrderSchema.index({ payOrderId: 1 })

module.exports = mongoose.models.CustomOrder || mongoose.model("CustomOrder", customOrderSchema)