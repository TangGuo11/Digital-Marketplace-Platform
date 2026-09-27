const express = require("express")
const router = express.Router()
const pointsController = require("../controllers/pointsController")

// CPX 适配器 cpxController
const cpxController = require("../controllers/cpxController") 
//Timewall 控制器
const timewallController = require("../controllers/timewallController") 

const { requireAuth, optionalAuth } = require("../middleware/auth")

/*---------- 基础/自测积分接口 ----------*/
router.get("/ad-types", pointsController.getAdTypes)
router.get("/ad/postback", pointsController.adPostback)
router.post("/ad/postback", pointsController.adPostback)

router.get("/balance", requireAuth, pointsController.getBalance)
router.get("/history", requireAuth, pointsController.getHistory)
router.get("/today-stats", requireAuth, pointsController.getTodayStats)
router.post("/ad/complete", requireAuth, pointsController.completeAdTask)
router.post("/redeem", requireAuth, pointsController.redeemProduct)
router.get("/my-orders", requireAuth, pointsController.getMyOrders)


/*---------- 广告商回调路由适配 ----------*/

// CPX 广告回调
router.get("/cpx/postback", cpxController.cpxPostback)
router.post("/cpx/postback", cpxController.cpxPostback)

// Timewall 广告回调（支持 GET 协议）
router.get("/timewall/postback", timewallController.timewallPostback)

module.exports = router