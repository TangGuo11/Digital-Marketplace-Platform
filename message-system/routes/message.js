const express = require("express")
const router = express.Router()
const controller = require("../controllers/messageController")
const rateLimit = require("../middleware/rateLimit")
const { optionalAuth } = require("../../user-system/middleware/auth")

router.use(optionalAuth)

router.post("/", rateLimit(3, 60 * 1000), controller.createMessage)
router.get("/", controller.getMessages)
router.post("/comment", controller.createComment)
router.get("/comment", controller.getComments)
router.post("/action", rateLimit(10, 60 * 1000), controller.actionMessage)

module.exports = router
