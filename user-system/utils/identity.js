const { v4: uuidv4 } = require("uuid")
const User = require("../models/User")

function getGuestUid(req, res) {
  let uid = req.cookies?.uid
  if (!uid) {
    uid = uuidv4()
    res.cookie("uid", uid, { maxAge: 1000 * 60 * 60 * 24 * 365 })
  }
  return uid
}

/** 返回留言板身份：优先登录用户，否则匿名 uid */
function getMessageIdentity(req, res) {
  if (req.user) {
    return {
      uid: req.user.guestUid || `user_${req.user._id}`,
      userId: req.user._id,
      displayName: req.user.nickname || req.user.username
    }
  }
  return {
    uid: getGuestUid(req, res),
    userId: null,
    displayName: null
  }
}

async function enrichMessagesWithDisplayName(messages) {
  const userIds = [...new Set(messages.filter(m => m.userId).map(m => m.userId.toString()))]
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } }).select("nickname username").lean()
    : []
  const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u]))

  return messages.map(msg => ({
    ...msg,
    authorName: msg.userId
      ? (userMap[msg.userId.toString()]?.nickname || userMap[msg.userId.toString()]?.username || "玩家")
      : `指令匠 · ${msg.uid.slice(-4)}`
  }))
}

module.exports = { getGuestUid, getMessageIdentity, enrichMessagesWithDisplayName }
