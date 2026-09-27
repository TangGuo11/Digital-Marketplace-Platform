// /root/WDSJSD/message-system/models/Message.js 👉 留言 数据模型
const mongoose = require("mongoose")

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 600
  },

  uid: {
    type: String,
    required: true,
    index: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
    index: true
  },

  ip: {
    type: String,
    required: true
  },

  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  likes: {
    type: Number,
    default: 0
  },

  dislikes: {
    type: Number,
    default: 0
  }

}, {
  versionKey: false
})

module.exports = mongoose.model("Message", messageSchema)