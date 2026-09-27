const mongoose = require("mongoose")

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20,
    index: true
  },

  passwordHash: {
    type: String,
    required: true
  },

  nickname: {
    type: String,
    default: "",
    maxlength: 30
  },

  email: {
    type: String,
    default: "",
    trim: true,
    lowercase: true
  },

  qq: {
    type: String,
    default: ""
  },

  wechat: {
    type: String,
    default: ""
  },

  points: {
    type: Number,
    default: 0,
    min: 0
  },

  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  },

  /** 留言板匿名 uid 绑定，登录后合并历史留言 */
  guestUid: {
    type: String,
    default: null,
    index: true
  },

  status: {
    type: String,
    enum: ["active", "banned"],
    default: "active"
  },

  lastLoginAt: Date,

  createdAt: {
    type: Date,
    default: Date.now
  }
})

UserSchema.index({ createdAt: -1 })

module.exports = mongoose.models.User || mongoose.model("User", UserSchema)
