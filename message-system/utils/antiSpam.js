// /root/WDSJSD/message-system/utils/antiSpam.js
/*
🔧 utils（工具函数）
敏感词过滤
重复内容检测
*/
const Message = require("../models/Message")

/**
 * 检查是否重复发送（30秒内）
 */
async function isDuplicateMessage(uid, content) {
  const recent = await Message.findOne({
    uid,
    content,
    createdAt: { $gt: new Date(Date.now() - 30 * 1000) }
  })

  return !!recent
}

/**
 * 简单敏感词过滤（你可以自己扩展）
 */
function containsBadWords(content) {
  const badWords = ["傻逼", "垃圾", "fuck", "黄片", "做片", "http://", "https://", "www", "废物", "妈", "鸡巴", "逼"]
  return badWords.some(word => content.includes(word))
}

module.exports = {
  isDuplicateMessage,
  containsBadWords
}