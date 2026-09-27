// /root/WDSJSD/message-system/models/Action.js 👉 点赞 / 点踩 数据模型
const mongoose = require("mongoose")

const actionSchema = new mongoose.Schema({
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },

  targetType: {
    type: String,
    enum: ["message", "comment"],
    required: true
  },

  uid: {
    type: String,
    required: true,
    index: true
  },

  type: {
    type: String,
    enum: ["like", "dislike"],
    required: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

}, {
  versionKey: false
})

/* 🚫 防止重复点赞（核心！） */
actionSchema.index(
  { targetId: 1, uid: 1, type: 1 },
  { unique: true }
)

module.exports = mongoose.model("Action", actionSchema)