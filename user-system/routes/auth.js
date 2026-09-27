const express = require("express")
const router = express.Router()
const authController = require("../controllers/authController")
const { optionalAuth, requireAuth } = require("../middleware/auth")

router.post("/register", authController.register)
router.post("/login", authController.login)
router.post("/logout", authController.logout)
router.get("/me", optionalAuth, authController.me)
router.put("/profile", requireAuth, authController.updateProfile)
router.put("/password", requireAuth, authController.changePassword)

module.exports = router
