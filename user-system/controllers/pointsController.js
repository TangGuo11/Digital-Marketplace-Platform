const Product = require("../../models/Product")
const Order = require("../../payment-system/models/Order")
const PointTransaction = require("../models/PointTransaction")
const User = require("../models/User")
const AD_TYPES = require("../config/adTypes")
const { addPoints, deductPoints, checkDailyAdLimit } = require("../utils/points")
const { adPostbackSign } = require("../utils/crypto")

exports.getAdTypes = async (req, res) => {
  const types = Object.entries(AD_TYPES).map(([key, val]) => ({
    key,
    ...val
  }))
  res.json({ success: true, data: types })
}

exports.getBalance = async (req, res) => {
  res.json({
    success: true,
    points: req.user.points
  })
}

exports.getHistory = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = 20
    const skip = (page - 1) * limit

    const [records, total] = await Promise.all([
      PointTransaction.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PointTransaction.countDocuments({ userId: req.user._id })
    ])

    res.json({
      success: true,
      records,
      page,
      total,
      hasMore: skip + records.length < total
    })
  } catch (err) {
    console.error("getHistory error:", err)
    res.json({ success: false, msg: "获取记录失败" })
  }
}

exports.getTodayStats = async (req, res) => {
  try {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const stats = {}
    for (const adType of Object.keys(AD_TYPES)) {
      const count = await PointTransaction.countDocuments({
        userId: req.user._id,
        adType,
        type: "earn",
        createdAt: { $gte: startOfDay }
      })
      stats[adType] = {
        used: count,
        limit: AD_TYPES[adType].dailyLimit,
        remaining: Math.max(0, AD_TYPES[adType].dailyLimit - count)
      }
    }

    res.json({ success: true, stats })
  } catch (err) {
    console.error("getTodayStats error:", err)
    res.json({ success: false, msg: "获取统计失败" })
  }
}

/**
 * 广告平台回调发积分
 * GET/POST /api/points/ad/postback
 * 参数: userId, adType, externalId, points, sign
 */
exports.adPostback = async (req, res) => {
  try {
    const params = { ...req.query, ...req.body }
    const { userId, adType, externalId, points: pointsStr, sign } = params

    if (!userId || !adType || !externalId || !pointsStr || !sign) {
      return res.status(400).send("missing_params")
    }

    const points = parseInt(pointsStr, 10)
    if (isNaN(points) || points <= 0 || points > 10000) {
      return res.status(400).send("invalid_points")
    }

    if (!AD_TYPES[adType]) {
      return res.status(400).send("invalid_ad_type")
    }

    const expectedSign = adPostbackSign(userId, externalId, points)
    if (sign !== expectedSign) {
      return res.status(403).send("invalid_sign")
    }

    const user = await User.findById(userId)
    if (!user || user.status !== "active") {
      return res.status(404).send("user_not_found")
    }

    const existing = await PointTransaction.findOne({ externalId, adType })
    if (existing) {
      return res.send("success")
    }

    const limitCheck = await checkDailyAdLimit(userId, adType)
    if (!limitCheck.ok) {
      return res.status(429).send("daily_limit")
    }

    await addPoints(userId, points, {
      type: "earn",
      adType,
      externalId,
      description: `${AD_TYPES[adType].name}任务奖励`
    })

    res.send("success")
  } catch (err) {
    console.error("adPostback error:", err)
    if (err.code === 11000) return res.send("success")
    res.status(500).send("error")
  }
}

/**
 * 前端演示/自测完成广告任务（正式接入后可关闭或加管理员密钥）
 */
exports.completeAdTask = async (req, res) => {
  try {
    const { adType } = req.body
    const config = AD_TYPES[adType]

    if (!config) {
      return res.json({ success: false, msg: "未知广告类型" })
    }

    const limitCheck = await checkDailyAdLimit(req.user._id, adType)
    if (!limitCheck.ok) {
      return res.json({ success: false, msg: limitCheck.msg })
    }

    const externalId = `demo_${req.user._id}_${adType}_${Date.now()}`

    const balance = await addPoints(req.user._id, config.defaultPoints, {
      type: "earn",
      adType,
      externalId,
      description: `${config.name}演示任务`
    })

    res.json({
      success: true,
      points: config.defaultPoints,
      balance,
      msg: `获得 ${config.defaultPoints} 积分`
    })
  } catch (err) {
    console.error("completeAdTask error:", err)
    res.json({ success: false, msg: "领取失败" })
  }
}

/** 积分兑换商店作品 */
exports.redeemProduct = async (req, res) => {
  try {
    const { productId } = req.body

    if (!productId) {
      return res.json({ success: false, msg: "请选择商品" })
    }

    const product = await Product.findById(productId)
    if (!product) {
      return res.json({ success: false, msg: "商品不存在" })
    }

    if (!product.pointsPrice || product.pointsPrice <= 0) {
      return res.json({ success: false, msg: "该商品不支持积分兑换" })
    }

    if (req.user.points < product.pointsPrice) {
      return res.json({
        success: false,
        msg: `积分不足，需要 ${product.pointsPrice} 积分，当前 ${req.user.points} 积分`
      })
    }

    const payId = `pts_${Date.now()}_${req.user._id.toString().slice(-6)}`

    await deductPoints(req.user._id, product.pointsPrice, {
      type: "redeem",
      productId: product._id.toString(),
      orderPayId: payId,
      description: `兑换作品：${product.title}`
    })

    await Order.create({
      payId,
      productId: product._id.toString(),
      productName: product.title,
      userId: req.user._id.toString(),
      price: 0,
      reallyPrice: 0,
      payType: 0,
      status: "paid",
      orderType: "points",
      pointsUsed: product.pointsPrice,
      paidAt: new Date(),
      delivered: true
    })

    res.json({
      success: true,
      payId,
      msg: "兑换成功",
      redirect: `/success-info.html?payId=${payId}`
    })
  } catch (err) {
    console.error("redeemProduct error:", err)
    res.json({ success: false, msg: err.message || "兑换失败" })
  }
}

/** 用户自己的订单（支付 + 积分兑换 + 委托） */
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      userId: req.user._id.toString(),
      status: "paid"
    })
      .sort({ paidAt: -1 })
      .limit(50)
      .lean()

    res.json({ success: true, data: orders })
  } catch (err) {
    console.error("getMyOrders error:", err)
    res.json({ success: false, msg: "获取订单失败" })
  }
}
