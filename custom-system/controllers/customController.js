// /root/WDSJSD/custom-system/controllers/customController.js
const CustomOrder = require("../models/CustomOrder")

/** 避免 /api/custom/.env 等扫描请求进入 findById 触发 BSON CastError */
function isMongoObjectIdString(id) {
  return typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id)
}

/** @returns {{ ok: true } | { ok: false, msg: string }} */
exports.validateRequirementPayload = (data) => {
  if (!data || typeof data !== "object") {
    return { ok: false, msg: "需求数据无效" }
  }
  const { contact, contactType, title, description, budget } = data
  if (!contact || typeof contact !== "string" || !["qq", "wechat"].includes(contactType)) {
    return { ok: false, msg: "联系方式错误" }
  }
  if (!title || typeof title !== "string" || title.length > 100) {
    return { ok: false, msg: "标题不合法" }
  }
  if (!description || typeof description !== "string" || description.length < 10 || description.length > 2000) {
    return { ok: false, msg: "需求描述长度不合法（10-2000字）" }
  }
  if (budget == null || Number(budget) <= 0) {
    return { ok: false, msg: "预算不合法" }
  }
  return { ok: true }
}

/*---------------- 获取诚意金商品配置 ----------------*/
exports.getDepositConfig = async (req, res) => {
  try {
    // 定制订单不需要数据库商品，直接返回固定配置
    res.json({
      success: true,
      data: {
        productId: "custom_deposit",  // 虚拟ID，不需要在数据库中存在
        price: 5,
        title: "定制作品诚意金"
      }
    })
  } catch (err) {
    console.error("getDepositConfig error:", err)
    res.json({ success: false, msg: "获取配置失败" })
  }
}

/*---------------- 支付成功后创建委托单（供支付回调调用）----------------*/
exports.createOrderAfterPayment = async (payId, requirementData, userId = null) => {
  try {
    const validated = exports.validateRequirementPayload(requirementData)
    if (!validated.ok) {
      throw new Error(validated.msg)
    }

    const existing = await CustomOrder.findOne({ payOrderId: payId })
    if (existing) {
      console.log("委托单已存在（幂等）:", payId)
      return existing
    }

    const { contact, contactType, title, description, budget } = requirementData

    const order = await CustomOrder.create({
      userId: userId || null,
      contact: contact.trim(),
      contactType,
      title: title.trim(),
      description: description.trim(),
      budget: Number(budget),
      status: "pending",
      payOrderId: payId,
      depositAmount: 5,
      createdAt: new Date()
    })
    
    console.log("✅ 委托单创建成功（已支付5元诚意金）:", order._id)
    return order
  } catch (err) {
    console.error("createOrderAfterPayment error:", err)
    throw err
  }
}


/*---------------- 获取用户自己的委托单 ----------------*/
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await CustomOrder.find({ userId: req.user._id.toString() })
      .sort({ createdAt: -1 })
      .limit(50)
      .select("title description budget status createdAt rejectedReason acceptedAt completedAt")

    res.json({ success: true, data: orders })
  } catch (err) {
    console.error("getMyCustomOrders error:", err)
    res.json({ success: false, msg: "获取委托失败" })
  }
}

/*---------------- 获取公开委托单列表（用户端）----------------*/
exports.getPublicOrders = async (req, res) => {
  try {
    const { status } = req.query
    
    let query = {}
    if (status && status !== 'all') {
      query.status = status
    }
    
    // 只返回公开字段，不包含联系方式
    const orders = await CustomOrder.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .select('title description budget status createdAt rejectedReason')
    
    res.json({
      success: true,
      data: orders
    })
  } catch (err) {
    console.error("getPublicOrders error:", err)
    res.json({ success: false, msg: "获取列表失败" })
  }
}

/*---------------- 获取完整委托单列表（管理员）----------------*/
exports.getAdminOrders = async (req, res) => {
  try {
    const { status } = req.query
    
    let query = {}
    if (status && status !== 'all') {
      query.status = status
    }
    
    const orders = await CustomOrder.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
    
    res.json({
      success: true,
      data: orders
    })
  } catch (err) {
    console.error("getAdminOrders error:", err)
    res.json({ success: false, msg: "获取列表失败" })
  }
}

/*---------------- 管理员接收委托 ----------------*/
exports.acceptOrder = async (req, res) => {
  try {
    const { orderId } = req.body
    
    if (!orderId) {
      return res.json({ success: false, msg: "缺少订单ID" })
    }
    
    const order = await CustomOrder.findById(orderId)
    
    if (!order) {
      return res.json({ success: false, msg: "委托单不存在" })
    }
    
    if (order.status !== "pending") {
      return res.json({ success: false, msg: "只能接收待处理的委托" })
    }
    
    order.status = "accepted"
    order.acceptedAt = new Date()
    await order.save()
    
    console.log("✅ 委托已接收:", orderId)
    res.json({ success: true })
  } catch (err) {
    console.error("acceptOrder error:", err)
    res.json({ success: false, msg: "操作失败" })
  }
}

/*---------------- 管理员拒绝委托 ----------------*/
exports.rejectOrder = async (req, res) => {
  try {
    const { orderId, reason } = req.body
    
    if (!orderId) {
      return res.json({ success: false, msg: "缺少订单ID" })
    }
    
    const order = await CustomOrder.findById(orderId)
    
    if (!order) {
      return res.json({ success: false, msg: "委托单不存在" })
    }
    
    if (order.status !== "pending") {
      return res.json({ success: false, msg: "只能拒绝待处理的委托" })
    }
    
    order.status = "rejected"
    order.rejectedAt = new Date()
    order.rejectedReason = reason || "未说明原因"
    await order.save()
    
    console.log("❌ 委托已拒绝:", orderId)
    res.json({ success: true })
  } catch (err) {
    console.error("rejectOrder error:", err)
    res.json({ success: false, msg: "操作失败" })
  }
}

/*---------------- 管理员完成委托 ----------------*/
exports.completeOrder = async (req, res) => {
  try {
    const { orderId } = req.body
    
    if (!orderId) {
      return res.json({ success: false, msg: "缺少订单ID" })
    }
    
    const order = await CustomOrder.findById(orderId)
    
    if (!order) {
      return res.json({ success: false, msg: "委托单不存在" })
    }
    
    if (order.status !== "accepted") {
      return res.json({ success: false, msg: "只能完成制作中的委托" })
    }
    
    order.status = "completed"
    order.completedAt = new Date()
    await order.save()
    
    console.log("✅ 委托已完成:", orderId)
    res.json({ success: true })
  } catch (err) {
    console.error("completeOrder error:", err)
    res.json({ success: false, msg: "操作失败" })
  }
}

/*---------------- 获取单个委托单详情（管理员用）----------------*/
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params

    if (!isMongoObjectIdString(id)) {
      return res.status(404).json({
        success: false,
        msg: "委托单不存在"
      })
    }

    const order = await CustomOrder.findById(id).lean()

    if (!order) {
      return res.json({
        success: false,
        msg: "委托单不存在"
      })
    }

    res.json({
      success: true,
      data: order
    })
  } catch (err) {
    console.error("getOrderById error:", err)
    res.json({ success: false, msg: "获取详情失败" })
  }
}