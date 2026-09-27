const crypto = require("crypto")

const JWT_SECRET = process.env.JWT_SECRET || "mh252n-jwt-secret-change-in-production"
const TOKEN_TTL_SEC = 7 * 24 * 3600

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex")
  const hash = crypto.scryptSync(password, salt, 64).toString("hex")
  return `${salt}:${hash}`
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":")
  if (!salt || !hash) return false
  const testHash = crypto.scryptSync(password, salt, 64).toString("hex")
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(testHash, "hex"))
  } catch {
    return false
  }
}

function b64url(data) {
  return Buffer.from(data).toString("base64url")
}

function signToken(payload) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }))
  const body = b64url(JSON.stringify({
    ...payload,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC
  }))
  const sig = crypto.createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url")
  return `${header}.${body}.${sig}`
}

function verifyToken(token) {
  if (!token || typeof token !== "string") return null
  const parts = token.split(".")
  if (parts.length !== 3) return null
  const [header, body, sig] = parts
  const expected = crypto.createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url")
  if (sig !== expected) return null
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString())
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

function adPostbackSign(userId, externalId, points) {
  const secret = process.env.AD_POSTBACK_SECRET || "mh252n-ad-postback-secret"
  return crypto.createHash("md5")
    .update(`${userId}${externalId}${points}${secret}`)
    .digest("hex")
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  adPostbackSign,
  JWT_SECRET
}
