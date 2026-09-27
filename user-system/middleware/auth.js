const User = require("../models/User")
const { verifyToken } = require("../utils/crypto")

function extractToken(req) {
  const auth = req.headers.authorization
  if (auth && auth.startsWith("Bearer ")) {
    return auth.slice(7)
  }
  return req.cookies?.token || null
}

async function optionalAuth(req, res, next) {
  try {
    const token = extractToken(req)
    if (!token) return next()

    const payload = verifyToken(token)
    if (!payload?.userId) return next()

    const user = await User.findById(payload.userId).lean()
    if (user && user.status === "active") {
      req.user = user
    }
    next()
  } catch (err) {
    next(err)
  }
}

async function requireAuth(req, res, next) {
  try {
    const token = extractToken(req)
    if (!token) {
      return res.status(401).json({ success: false, msg: "请先登录" })
    }

    const payload = verifyToken(token)
    if (!payload?.userId) {
      return res.status(401).json({ success: false, msg: "登录已过期，请重新登录" })
    }

    const user = await User.findById(payload.userId)
    if (!user || user.status !== "active") {
      return res.status(401).json({ success: false, msg: "账号不可用" })
    }

    req.user = user
    next()
  } catch (err) {
    next(err)
  }
}

module.exports = { optionalAuth, requireAuth, extractToken }
