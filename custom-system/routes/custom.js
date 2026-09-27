// /root/WDSJSD/custom-system/routes/custom.js
const express = require("express")
const router = express.Router()
const controller = require("../controllers/customController")
const { requireAuth } = require("../../user-system/middleware/auth")

router.get("/deposit-config", controller.getDepositConfig)
router.get("/public", controller.getPublicOrders)
router.get("/my", requireAuth, controller.getMyOrders)

router.get("/admin", controller.getAdminOrders)

// 获取单个委托单详情（非法 id 如 .env 由控制器拦截，避免 BSON CastError）
router.get("/:id", controller.getOrderById)

// 接收委托
router.post("/accept", controller.acceptOrder)

// 拒绝委托
router.post("/reject", controller.rejectOrder)

// 完成委托
router.post("/complete", controller.completeOrder)

module.exports = router