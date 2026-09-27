/*---------- Timewall 广告商适配回调地址 ----------*/
const crypto = require("crypto");
const { addPoints, deductPoints } = require("../utils/points");
const PointTransaction = require("../models/PointTransaction");
const User = require("../models/User");

// Timewall 配置
const TIMEWALL_CONFIG = {
  // 从 Timewall 后台获取的 Secret Key
  SECRET_KEY: "6e9d31b474fba027320826bd217435e6",
  // IP 白名单
  ALLOWED_IPS: [
    "18.156.132.55",
    "51.81.120.73", 
    "142.111.248.18"
  ],
  // 广告类型
  AD_TYPE: "timewall"
};

/**
 * 验证 IP 是否在白名单中（支持清洗 IPv6 前缀）
 */
const isIPAllowed = (ip) => {
  if (!TIMEWALL_CONFIG.ALLOWED_IPS || TIMEWALL_CONFIG.ALLOWED_IPS.length === 0) {
    return true;
  }
  if (!ip) return false;
  
  // 清洗可能存在的 IPv6 映射格式，例如 "::ffff:18.156.132.55" -> "18.156.132.55"
  const cleanIP = ip.replace(/^.*:/, '').trim();
  return TIMEWALL_CONFIG.ALLOWED_IPS.includes(cleanIP);
};

/**
 * 验证 Timewall 的 hash 签名
 * hash = SHA256(userID.revenue.SecretKey)
 */
const verifyHash = (userId, revenue, hash) => {
  if (!hash) {
    console.warn("Timewall: No hash provided, skipping verification");
    return true;
  }
  
  // Timewall 标准格式是使用 "." 进行拼接拼接：userID.revenue.SecretKey
  const dataToHash = `${userId}.${revenue}.${TIMEWALL_CONFIG.SECRET_KEY}`;
  
  const expectedHash = crypto
    .createHash("sha256")
    .update(dataToHash)
    .digest("hex");
  
  return hash.toLowerCase() === expectedHash.toLowerCase();
};

/**
 * Timewall 主回调接口
 * GET /api/points/timewall/postback
 */
exports.timewallPostback = async (req, res) => {
  try {
    // 1. 获取所有参数（GET 请求）
    const {
      userId,
      transactionID,
      currencyAmount,
      revenue,
      type,
      hash,
      ip,
      withdrawid,
      reason,
      offername,
      offerdetail
    } = req.query;

    // 2. 基础参数校验
    if (!userId || !transactionID) {
      console.error("Timewall postback: Missing required parameters", { userId, transactionID });
      return res.status(400).send("missing_params");
    }

    // 3. IP 白名单验证（优先取代理 IP，防范 Nginx 转发丢失客户端真实 IP）
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0].trim() || ip || req.ip || req.connection.remoteAddress;
    if (!isIPAllowed(clientIP)) {
      console.error("Timewall postback: IP not allowed", { clientIP });
      return res.status(403).send("ip_not_allowed");
    }

    // 4. Hash 签名验证
    if (!verifyHash(userId, revenue || "0", hash)) {
      console.error("Timewall postback: Invalid signature", { userId, revenue, hash });
      return res.status(403).send("invalid_sign");
    }

    // 5. 解析积分数量（可能是负数）
    const points = parseFloat(currencyAmount);
    if (isNaN(points)) {
      console.error("Timewall postback: Invalid currencyAmount", { currencyAmount });
      return res.status(400).send("invalid_points");
    }

    // 6. 检查用户是否存在
    const user = await User.findById(userId);
    if (!user || user.status !== "active") {
      console.error("Timewall postback: User not found or inactive", { userId });
      return res.status(404).send("user_not_found");
    }

    // 7. 根据 type 处理不同逻辑
    const transactionType = type || "credit";

    // 7.1 检查是否已存在该交易（防重）
    const existing = await PointTransaction.findOne({
      externalId: transactionID,
      adType: TIMEWALL_CONFIG.AD_TYPE
    });

    if (existing) {
      // 如果交易已存在，根据当前请求的 type 决定是否需要更新状态
      if (transactionType === "credit") {
        // 已发放过，直接返回成功
        return res.send("success");
      } else if (transactionType === "chargeback") {
        // 如果之前是 credit，现在要 chargeback，但已经处理过了，检查是否需要扣回
        if (existing.type === "earn" && existing.amount > 0) {
          // 之前发放过积分，现在需要扣回
          await handleChargeback(userId, transactionID, points, existing);
          return res.send("success");
        }
        return res.send("success");
      } else if (transactionType === "hold_cancelled") {
        // 取消暂扣，更新状态即可
        await PointTransaction.updateOne(
          { externalId: transactionID },
          { 
            $set: { 
              "metadata.holdStatus": "cancelled",
              "metadata.cancelledAt": new Date(),
              "metadata.cancelReason": reason || "hold_cancelled"
            }
          }
        );
        return res.send("success");
      }
      return res.send("success");
    }

    // 8. 根据 type 执行不同操作
    switch (transactionType) {
      case "credit":
        // 正常发放积分
        if (points <= 0) {
          console.warn("Timewall postback: Credit with non-positive points", { points });
          return res.send("ignored");
        }
        await handleCredit(userId, transactionID, points, revenue, req.query);
        break;

      case "chargeback":
        // 扣回积分
        if (points >= 0) {
          console.warn("Timewall postback: Chargeback with non-negative points", { points });
          return res.send("ignored");
        }
        // 检查是否曾经发放过这个 transactionID
        const creditedRecord = await PointTransaction.findOne({
          externalId: transactionID,
          adType: TIMEWALL_CONFIG.AD_TYPE,
          type: "earn"
        });
        if (creditedRecord) {
          await handleChargeback(userId, transactionID, Math.abs(points), creditedRecord);
        } else {
          // 如果没找到发放记录，记录 chargeback 但不扣分
          console.warn("Timewall postback: Chargeback but no credit record found", { transactionID });
          await recordChargebackOnly(userId, transactionID, Math.abs(points), req.query);
        }
        break;

      case "hold":
        // 暂扣状态 - 不发放积分，只记录状态
        await handleHold(userId, transactionID, points, revenue, req.query);
        break;

      case "hold_cancelled":
        // 取消暂扣 - 不操作积分，只记录状态
        await handleHoldCancelled(userId, transactionID, req.query);
        break;

      default:
        console.error("Timewall postback: Unknown type", { type });
        return res.status(400).send("unknown_type");
    }

    // 9. 返回成功
    res.send("success");

  } catch (err) {
    console.error("Timewall postback error:", err);
    if (err.code === 11000) {
      return res.send("success");
    }
    res.status(500).send("error");
  }
};

/**
 * 处理正常发放积分
 */
async function handleCredit(userId, transactionID, points, revenue, params) {
  await addPoints(userId, points, {
    type: "earn",
    adType: TIMEWALL_CONFIG.AD_TYPE,
    externalId: transactionID,
    description: `TimeWall 任务奖励`,
    metadata: {
      revenue: revenue || 0,
      withdrawId: params.withdrawid || "",
      offerName: params.offername || "",
      offerDetail: params.offerdetail || "",
      type: "credit"
    }
  });

  console.log(`Timewall credit success: userId=${userId}, points=${points}, transactionId=${transactionID}`);
}

/**
 * 处理扣回积分（chargeback）
 */
async function handleChargeback(userId, transactionID, points, creditRecord) {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // 如果当前积分少于需要扣除的，扣除到 0 为止
  const deductAmount = Math.min(points, user.points);

  if (deductAmount > 0) {
    await deductPoints(userId, deductAmount, {
      type: "spend",
      adType: TIMEWALL_CONFIG.AD_TYPE,
      externalId: transactionID,
      description: `TimeWall 扣回（chargeback）`,
      metadata: {
        originalTransaction: transactionID,
        originalAmount: creditRecord.amount || 0,
        chargebackAmount: points,
        type: "chargeback"
      }
    });
  }

  // 更新原交易记录，标记为已扣回
  await PointTransaction.updateOne(
    { externalId: transactionID, adType: TIMEWALL_CONFIG.AD_TYPE },
    { 
      $set: { 
        "metadata.chargeback": true,
        "metadata.chargebackAmount": points,
        "metadata.chargebackAt": new Date()
      }
    }
  );

  console.log(`Timewall chargeback success: userId=${userId}, points=${deductAmount}, transactionId=${transactionID}`);
}

/**
 * 记录 chargeback 但不扣积分（当没有找到原始发放记录时）
 */
async function recordChargebackOnly(userId, transactionID, points, params) {
  await PointTransaction.create({
    userId,
    amount: 0,
    type: "spend",
    adType: TIMEWALL_CONFIG.AD_TYPE,
    externalId: transactionID,
    description: `TimeWall 扣回（无原始记录）`,
    metadata: {
      revenue: params.revenue || 0,
      withdrawId: params.withdrawid || "",
      type: "chargeback_no_record",
      chargebackAmount: points,
      reason: params.reason || ""
    }
  });
}

/**
 * 处理 hold（暂扣）状态
 */
async function handleHold(userId, transactionID, points, revenue, params) {
  // 检查是否已经存在该交易
  const existing = await PointTransaction.findOne({
    externalId: transactionID,
    adType: TIMEWALL_CONFIG.AD_TYPE
  });

  if (existing) {
    // 如果是 hold 状态，更新信息
    if (existing.metadata && existing.metadata.holdStatus === "pending") {
      await PointTransaction.updateOne(
        { externalId: transactionID },
        { 
          $set: { 
            "metadata.holdReason": params.reason || "",
            "metadata.holdUpdatedAt": new Date()
          }
        }
      );
    }
    return;
  }

  // 创建 hold 记录（不发放积分）
  await PointTransaction.create({
    userId,
    amount: 0,
    type: "earn",
    adType: TIMEWALL_CONFIG.AD_TYPE,
    externalId: transactionID,
    description: `TimeWall 暂扣待验证`,
    metadata: {
      revenue: revenue || 0,
      withdrawId: params.withdrawid || "",
      offerName: params.offername || "",
      holdStatus: "pending",
      holdReason: params.reason || "",
      holdAmount: points,
      holdAt: new Date()
    }
  });

  console.log(`Timewall hold created: userId=${userId}, transactionId=${transactionID}, pendingAmount=${points}`);
}

/**
 * 处理 hold_cancelled（取消暂扣）
 */
async function handleHoldCancelled(userId, transactionID, params) {
  // 查找 hold 记录
  const holdRecord = await PointTransaction.findOne({
    externalId: transactionID,
    adType: TIMEWALL_CONFIG.AD_TYPE,
    "metadata.holdStatus": "pending"
  });

  if (holdRecord) {
    // 更新为已取消
    await PointTransaction.updateOne(
      { externalId: transactionID },
      { 
        $set: { 
          "metadata.holdStatus": "cancelled",
          "metadata.cancelledAt": new Date(),
          "metadata.cancelReason": params.reason || "hold_cancelled"
        }
      }
    );
    console.log(`Timewall hold cancelled: userId=${userId}, transactionId=${transactionID}`);
  } else {
    // 如果没有找到 hold 记录，记录这次取消
    await PointTransaction.create({
      userId,
      amount: 0,
      type: "earn",
      adType: TIMEWALL_CONFIG.AD_TYPE,
      externalId: transactionID,
      description: `TimeWall 取消暂扣（无暂扣记录）`,
      metadata: {
        type: "hold_cancelled_no_record",
        reason: params.reason || "",
        cancelledAt: new Date()
      }
    });
    console.warn(`Timewall hold cancelled but no hold record: userId=${userId}, transactionId=${transactionID}`);
  }
}