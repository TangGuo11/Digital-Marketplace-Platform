/*---------- CPX 广告商适配回调地址 ----------*/
const crypto = require("crypto") // 引入加密模块用于签名校验
const { addPoints } = require("../utils/points")
const PointTransaction = require("../models/PointTransaction")
const User = require("../models/User")

exports.cpxPostback = async (req, res) => {
  try {
    // 1. 获取 CPX 广告商发过来的【真实字段名】
    const {
      user_id,
      amount_local, // 对应 CPX 的 amount_local
      trans_id,     // 对应 CPX 的 trans_id
      status,
      hash          // CPX 传过来的安全哈希校验值
    } = req.query

    // 2. 基础校验（对齐 CPX 的字段名）
    if (!user_id || !trans_id) {
      return res.status(400).send("missing_params")
    }

    // 3. 安全校验：验证请求确实来自 CPX 官方，防止黑客恶意伪造请求刷积分
    // ⚠️ 记得把下面这串替换成你在 CPX 后台看到的真实安全密钥 (App Secure Hash)
    const CPX_APP_SECURE_HASH = "3KXxLCxaMCKiyAiHd17NXeJpXxE6qqwh" 
    const expectedHash = crypto
      .createHash("md5")
      .update(`${trans_id}-${CPX_APP_SECURE_HASH}`)
      .digest("hex")

    if (expectedHash !== hash) {
      return res.status(403).send("invalid_sign")
    }

    // 4. 状态校验：只接受成功完成问卷（status == "1"）
    if (status && status !== "1") {
      return res.send("ignored")
    }

    // 5. 妥善处理高精度字符串（如 "0.0000"），将其安全转为整数
    const points = amount_local ? Math.round(parseFloat(amount_local)) : 0

    // 6. 防重复校验
    const existing = await PointTransaction.findOne({
      externalId: trans_id // 使用对齐后的 trans_id
    })

    if (existing) {
      return res.send("ok")
    }

    // —— 💡 特殊处理测试流量 ——
    // 在 CPX 触发测试回传时，积分数值可能为 0。
    // 为了通过测试，我们不执行数据库写入，但必须给 CPX 服务器正常回传 "ok" 结束握手
    if (points <= 0) {
      return res.send("ok")
    }

    // 7. 用户检查
    const user = await User.findById(user_id)
    if (!user || user.status !== "active") {
      return res.status(404).send("user_not_found")
    }

    // 8. 真正发放积分（走你系统的统一 addPoints 方法）
    await addPoints(user_id, points, {
      type: "earn",
      adType: "cpx", // 对应你的广告类型
      externalId: trans_id,
      description: "CPX问卷奖励"
    })

    res.send("ok")

  } catch (err) {
    console.error("CPX postback error:", err)
    res.status(500).send("error")
  }
}