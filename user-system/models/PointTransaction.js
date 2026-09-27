const mongoose = require("mongoose")

const PointTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },

  amount: {
    type: Number,
    required: true
  },

  balanceAfter: {
    type: Number,
    required: true
  },

  type: {
    type: String,
    enum: ["earn", "redeem", "admin", "refund"],
    required: true,
    index: true
  },

  /** 广告类型：offerwall / survey / rewarded_video / popunder / push / banner */
  adType: {
    type: String,
    default: null,
    index: true
  },

  /** 外部广告平台交易 ID，防重复发奖 */
  externalId: {
    type: String,
    default: null,
    sparse: true
  },

  productId: String,
  orderPayId: String,

  description: {
    type: String,
    default: ""
  },

  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
})

PointTransactionSchema.index({ userId: 1, createdAt: -1 })
PointTransactionSchema.index({ externalId: 1, adType: 1 }, { unique: true, sparse: true })

module.exports = mongoose.models.PointTransaction ||
  mongoose.model("PointTransaction", PointTransactionSchema)
