//  /root/WDSJSD/message-system/middleware/rateLimit.js
/*
🛡️ middleware（中间件）
限流（防刷）
UID生成
*/
const requestMap = new Map()

/**
 * 简单内存限流
 * @param {number} limit 次数
 * @param {number} windowMs 时间窗口（毫秒）
 */
function rateLimit(limit = 5, windowMs = 60 * 1000) {
  return (req, res, next) => {
    const ip =
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress ||
      ""

    const now = Date.now()

    if (!requestMap.has(ip)) {
      requestMap.set(ip, [])
    }

    const timestamps = requestMap.get(ip)

    // 清理过期请求
    const valid = timestamps.filter(ts => now - ts < windowMs)

    valid.push(now)
    requestMap.set(ip, valid)

    if (valid.length > limit) {
      return res.status(429).json({
        error: "Too many requests, slow down"
      })
    }

    next()
  }
}

module.exports = rateLimit