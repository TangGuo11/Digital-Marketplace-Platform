// /root/WDSJSD/message-system/controllers/messageController.js
const Message = require("../models/Message")
const Comment = require("../models/Comment")
const Action = require("../models/Action")
const User = require("../../user-system/models/User")
const { isDuplicateMessage, containsBadWords } = require("../utils/antiSpam")
const { getMessageIdentity, enrichMessagesWithDisplayName } = require("../../user-system/utils/identity")

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    ""
  ).split(",")[0]
}

exports.createMessage = async (req, res) => {
  try {
    const { content } = req.body
    if (!content || content.length > 600) {
      return res.status(400).json({ error: "Invalid content" })
    }

    const identity = getMessageIdentity(req, res)
    const ip = getClientIp(req)

    if (await isDuplicateMessage(identity.uid, content)) {
      return res.status(429).json({ error: "不要重复发送" })
    }

    if (containsBadWords(content)) {
      return res.status(400).json({ error: "内容违规" })
    }

    const message = new Message({
      content,
      uid: identity.uid,
      userId: identity.userId,
      ip
    })

    await message.save()

    res.json({
      success: true,
      message: {
        ...message.toObject(),
        authorName: identity.displayName || `指令匠 · ${identity.uid.slice(-4)}`
      }
    })
  } catch (err) {
    console.error("❌ CREATE MESSAGE:", err)
    res.status(500).json({ error: err.message })
  }
}

exports.getMessages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = 20
    const skip = (page - 1) * limit

    let messages = await Message.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    for (let msg of messages) {
      msg.commentCount = await Comment.countDocuments({ messageId: msg._id })
    }

    messages = await enrichMessagesWithDisplayName(messages)

    res.json({ success: true, messages })
  } catch (err) {
    console.error("❌ GET MESSAGES:", err)
    res.status(500).json({ error: err.message })
  }
}

exports.createComment = async (req, res) => {
  try {
    const { messageId, content } = req.body

    if (!content || content.length > 600) {
      return res.status(400).json({ error: "Invalid content" })
    }

    const identity = getMessageIdentity(req, res)
    const ip = getClientIp(req)

    const comment = new Comment({
      messageId,
      content,
      uid: identity.uid,
      userId: identity.userId,
      ip
    })

    await comment.save()

    res.json({
      success: true,
      comment: {
        ...comment.toObject(),
        authorName: identity.displayName || `指令匠 · ${identity.uid.slice(-4)}`
      }
    })
  } catch (err) {
    console.error("❌ CREATE COMMENT:", err)
    res.status(500).json({ error: err.message })
  }
}

exports.getComments = async (req, res) => {
  try {
    const { messageId } = req.query

    let comments = await Comment.find({ messageId })
      .sort({ createdAt: -1 })
      .lean()

    const userIds = [...new Set(comments.filter(c => c.userId).map(c => c.userId.toString()))]
    const users = userIds.length
      ? await User.find({ _id: { $in: userIds } }).select("nickname username").lean()
      : []
    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u]))

    comments = comments.map(c => ({
      ...c,
      authorName: c.userId
        ? (userMap[c.userId.toString()]?.nickname || userMap[c.userId.toString()]?.username || "玩家")
        : `指令匠 · ${c.uid.slice(-4)}`
    }))

    res.json({ success: true, comments })
  } catch (err) {
    console.error("❌ GET COMMENTS:", err)
    res.status(500).json({ error: err.message })
  }
}

exports.actionMessage = async (req, res) => {
  try {
    const { targetId, type } = req.body

    if (!["like", "dislike"].includes(type)) {
      return res.status(400).json({ error: "Invalid type" })
    }

    const identity = getMessageIdentity(req, res)

    const exist = await Action.findOne({
      targetId,
      uid: identity.uid,
      type
    })

    if (exist) {
      return res.status(400).json({ error: "Already done" })
    }

    await Action.create({
      targetId,
      targetType: "message",
      uid: identity.uid,
      type
    })

    const update = type === "like"
      ? { $inc: { likes: 1 } }
      : { $inc: { dislikes: 1 } }

    await Message.findByIdAndUpdate(targetId, update)

    res.json({ success: true })
  } catch (err) {
    console.error("❌ ACTION:", err)
    res.status(500).json({ error: err.message })
  }
}
