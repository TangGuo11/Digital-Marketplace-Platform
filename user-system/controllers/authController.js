const User = require("../models/User")
const Message = require("../../message-system/models/Message")
const Comment = require("../../message-system/models/Comment")
const { hashPassword, verifyPassword, signToken } = require("../utils/crypto")

function sanitizeUser(user) {
  return {
    id: user._id,
    username: user.username,
    nickname: user.nickname || user.username,
    email: user.email,
    qq: user.qq,
    wechat: user.wechat,
    points: user.points,
    role: user.role,
    createdAt: user.createdAt
  }
}

function validateUsername(username) {
  if (!username || typeof username !== "string") return "用户名不能为空"
  const trimmed = username.trim()
  if (trimmed.length < 3 || trimmed.length > 20) return "用户名需 3-20 个字符"
  if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(trimmed)) return "用户名仅支持字母、数字、下划线和中文"
  return null
}

function validatePassword(password) {
  if (!password || typeof password !== "string") return "密码不能为空"
  if (password.length < 6 || password.length > 32) return "密码需 6-32 个字符"
  return null
}

/** 登录后合并留言板匿名 uid 的历史数据 */
async function mergeGuestUid(user, guestUid) {
  if (!guestUid || user.guestUid === guestUid) return

  await Message.updateMany({ uid: guestUid }, { $set: { userId: user._id } })
  await Comment.updateMany({ uid: guestUid }, { $set: { userId: user._id } })

  user.guestUid = guestUid
  await user.save()
}

exports.register = async (req, res) => {
  try {
    const { username, password, nickname, email } = req.body
    const guestUid = req.cookies?.uid

    const userErr = validateUsername(username)
    if (userErr) return res.json({ success: false, msg: userErr })

    const passErr = validatePassword(password)
    if (passErr) return res.json({ success: false, msg: passErr })

    const exists = await User.findOne({ username: username.trim() })
    if (exists) return res.json({ success: false, msg: "用户名已被占用" })

    const user = await User.create({
      username: username.trim(),
      passwordHash: hashPassword(password),
      nickname: (nickname || username).trim().slice(0, 30),
      email: (email || "").trim().toLowerCase(),
      guestUid: guestUid || null
    })

    if (guestUid) {
      await mergeGuestUid(user, guestUid)
    }

    const token = signToken({ userId: user._id.toString() })

    res.cookie("token", token, {
      maxAge: 7 * 24 * 3600 * 1000,
      httpOnly: true,
      sameSite: "lax"
    })

    res.json({
      success: true,
      token,
      user: sanitizeUser(user)
    })
  } catch (err) {
    console.error("register error:", err)
    res.json({ success: false, msg: "注册失败" })
  }
}

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body
    const guestUid = req.cookies?.uid

    if (!username || !password) {
      return res.json({ success: false, msg: "请输入用户名和密码" })
    }

    const user = await User.findOne({ username: username.trim() })
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.json({ success: false, msg: "用户名或密码错误" })
    }

    if (user.status === "banned") {
      return res.json({ success: false, msg: "账号已被禁用" })
    }

    user.lastLoginAt = new Date()
    await user.save()

    if (guestUid) {
      await mergeGuestUid(user, guestUid)
    }

    const token = signToken({ userId: user._id.toString() })

    res.cookie("token", token, {
      maxAge: 7 * 24 * 3600 * 1000,
      httpOnly: true,
      sameSite: "lax"
    })

    res.json({
      success: true,
      token,
      user: sanitizeUser(user)
    })
  } catch (err) {
    console.error("login error:", err)
    res.json({ success: false, msg: "登录失败" })
  }
}

exports.logout = async (req, res) => {
  res.clearCookie("token")
  res.json({ success: true })
}

exports.me = async (req, res) => {
  if (!req.user) {
    return res.json({ success: true, loggedIn: false })
  }
  res.json({
    success: true,
    loggedIn: true,
    user: sanitizeUser(req.user)
  })
}

exports.updateProfile = async (req, res) => {
  try {
    const { nickname, email, qq, wechat } = req.body
    const user = req.user

    if (nickname != null) user.nickname = String(nickname).trim().slice(0, 30)
    if (email != null) user.email = String(email).trim().toLowerCase().slice(0, 100)
    if (qq != null) user.qq = String(qq).trim().slice(0, 20)
    if (wechat != null) user.wechat = String(wechat).trim().slice(0, 30)

    await user.save()

    res.json({ success: true, user: sanitizeUser(user) })
  } catch (err) {
    console.error("updateProfile error:", err)
    res.json({ success: false, msg: "更新失败" })
  }
}

exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body
    const user = req.user

    if (!verifyPassword(oldPassword, user.passwordHash)) {
      return res.json({ success: false, msg: "原密码错误" })
    }

    const passErr = validatePassword(newPassword)
    if (passErr) return res.json({ success: false, msg: passErr })

    user.passwordHash = hashPassword(newPassword)
    await user.save()

    res.json({ success: true, msg: "密码已修改" })
  } catch (err) {
    console.error("changePassword error:", err)
    res.json({ success: false, msg: "修改失败" })
  }
}
