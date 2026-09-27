///root/WDSJSD/message-system/models/Comment.js 👉 评论 数据模型
const mongoose = require("mongoose")

const commentSchema = new mongoose.Schema({
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message",
    required: true,
    index: true
  },

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
    default: Date.now
  }

}, {
  versionKey: false
})

module.exports = mongoose.model("Comment", commentSchema)