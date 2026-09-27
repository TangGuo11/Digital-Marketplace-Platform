const User = require("../models/User")
const PointTransaction = require("../models/PointTransaction")
const AD_TYPES = require("../config/adTypes")

async function addPoints(userId, amount, meta = {}) {
  if (amount <= 0) throw new Error("积分数量无效")

  const user = await User.findById(userId)
  if (!user) throw new Error("用户不存在")

  user.points += amount
  await user.save()

  await PointTransaction.create({
    userId,
    amount,
    balanceAfter: user.points,
    type: meta.type || "earn",
    adType: meta.adType || null,
    externalId: meta.externalId || null,
    productId: meta.productId || null,
    orderPayId: meta.orderPayId || null,
    description: meta.description || ""
  })

  return user.points
}

async function deductPoints(userId, amount, meta = {}) {
  if (amount <= 0) throw new Error("积分数量无效")

  const user = await User.findById(userId)
  if (!user) throw new Error("用户不存在")
  if (user.points < amount) throw new Error("积分不足")

  user.points -= amount
  await user.save()

  await PointTransaction.create({
    userId,
    amount: -amount,
    balanceAfter: user.points,
    type: meta.type || "redeem",
    productId: meta.productId || null,
    orderPayId: meta.orderPayId || null,
    description: meta.description || ""
  })

  return user.points
}

async function checkDailyAdLimit(userId, adType) {
  const config = AD_TYPES[adType]
  if (!config) return { ok: false, msg: "未知广告类型" }

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const count = await PointTransaction.countDocuments({
    userId,
    adType,
    type: "earn",
    createdAt: { $gte: startOfDay }
  })

  if (count >= config.dailyLimit) {
    return { ok: false, msg: `今日${config.name}任务已达上限（${config.dailyLimit}次）` }
  }

  return { ok: true, remaining: config.dailyLimit - count }
}

module.exports = { addPoints, deductPoints, checkDailyAdLimit }
