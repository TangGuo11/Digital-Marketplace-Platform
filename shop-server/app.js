// /root/WDSJSD/shop-server/app.js

/*------- 导入依赖模块 ----------*/
const express = require("express")
const mongoose = require("mongoose")
const multer = require("multer")
const path = require("path")  // ⚠️ 必须在 dotenv 之前引入
const fs = require("fs")
const cors = require("cors")
const { v4: uuidv4 } = require("uuid")
const cookieParser = require("cookie-parser")

// 加载环境变量（必须在 path 引入之后）
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Product = require("../models/Product")
const payRouter = require("../payment-system/routes/pay")
const messageRouter = require("../message-system/routes/message")
const customRouter = require("../custom-system/routes/custom")
const authRouter = require("../user-system/routes/auth")
const pointsRouter = require("../user-system/routes/points")

const app = express()

/*------- 中间件配置 ----------*/
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.use("/uploads", express.static(path.join(__dirname, "../uploads")))
app.use("/", express.static(path.join(__dirname, "../public")))
app.use("/api/pay", payRouter)
app.use("/api/message", messageRouter)
app.use("/api/custom", customRouter)
app.use("/api/auth", authRouter)
app.use("/api/points", pointsRouter)

/*------- MongoDB ----------*/
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ MongoDB error:", err));

/*------ 工具函数区 -------*/
function isValidBilibiliUrl(url) {
  return /^https?:\/\/(www\.)?bilibili\.com\/video\//.test(url)
}

function extractBv(url) {
  if (!url) return null
  const match = url.match(/BV[0-9A-Za-z]+/)
  return match ? match[0] : null
}

function normalizeBilibiliUrl(url) {
  if (!url) return ""
  const bv = extractBv(url)
  if (!bv) return ""
  return `https://www.bilibili.com/video/${bv}`
}

function toEmbedUrl(bv) {
  if (!bv) return ""
  return `https://player.bilibili.com/player.html?bvid=${bv}`
}

/*------- 文件上传 ----------*/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const productId = req.body.productId
    if (!productId) return cb(new Error("productId missing"))

    const dir = path.join(__dirname, "../uploads/products", productId)
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, uuidv4() + ext)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image") || file.mimetype.startsWith("video")) {
      cb(null, true)
    } else {
      cb(new Error("Only image/video allowed"))
    }
  }
})

/*------- 创建作品 ----------*/
app.post("/product/create", async (req, res) => {
  try {
    let { title, price, description, bilibiliUrl } = req.body

    bilibiliUrl = bilibiliUrl?.trim() || ""
    bilibiliUrl = normalizeBilibiliUrl(bilibiliUrl)

    if (bilibiliUrl && !isValidBilibiliUrl(bilibiliUrl)) {
      return res.status(400).json({ error: "Invalid bilibili url" })
    }

    const product = new Product({
      title,
      price,
      description,
      bilibiliUrl,
      pointsPrice: req.body.pointsPrice ? Number(req.body.pointsPrice) : null,
      media: [],
      createdAt: new Date()
    })

    await product.save()

    res.json({
      success: true,
      productId: product._id
    })

  } catch (err) {
    console.error("❌ CREATE ERROR:", err)
    res.status(500).json({ error: err.message })
  }
})

/*------- 上传媒体 ----------*/
app.post("/product/upload", upload.array("files", 20), async (req, res) => {
  try {
    const productId = req.body.productId
    if (!productId) {
      return res.status(400).json({ error: "productId missing" })
    }

    const files = req.files
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" })
    }

    const product = await Product.findById(productId)
    if (!product) {
      return res.status(404).json({ error: "Product not found" })
    }

    const startOrder = product.media.length

    const media = files.map((file, index) => ({
      type: file.mimetype.startsWith("image") ? "image" : "video",
      url: `/uploads/products/${productId}/${file.filename}`,
      order: startOrder + index
    }))

    await Product.findByIdAndUpdate(productId, {
      $push: { media: { $each: media } }
    })

    res.json({
      success: true,
      uploaded: media.length,
      media
    })

  } catch (err) {
    console.error("❌ UPLOAD ERROR:", err)
    res.status(500).json({ error: err.message })
  }
})

/*------- 获取作品列表 ----------*/
app.get("/products", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const rawLimit = parseInt(req.query.limit, 10) || 50
    const pageSize = Math.min(Math.max(rawLimit, 1), 50)

    const skip = (page - 1) * pageSize

    let products = await Product.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize + 1)
      .lean()

    const hasMore = products.length > pageSize
    if (hasMore) products.pop()

    products = products.map(p => {
      const bv = extractBv(p.bilibiliUrl)
      return {
        ...p,
        bilibiliEmbed: toEmbedUrl(bv)
      }
    })

    res.json({ success: true, products, hasMore, page, pageSize })

  } catch (err) {
    console.error("❌ PRODUCTS ERROR:", err)
    res.status(500).json({ error: err.message })
  }
})

/*------- 获取单个作品 ----------*/
app.get("/product/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean()
    if (!product) {
      return res.status(404).json({ error: "Product not found" })
    }

    const bv = extractBv(product.bilibiliUrl)

    res.json({
      success: true,
      product: {
        ...product,
        bilibiliEmbed: toEmbedUrl(bv)
      }
    })

  } catch (err) {
    console.error("❌ PRODUCT DETAIL ERROR:", err)
    res.status(500).json({ error: err.message })
  }
})

/*------- 更新作品积分价格（管理用） ----------*/
app.put("/product/:id/points", async (req, res) => {
  try {
    const { pointsPrice } = req.body
    const val = pointsPrice === null || pointsPrice === "" ? null : Number(pointsPrice)
    if (val !== null && (isNaN(val) || val < 0)) {
      return res.status(400).json({ error: "Invalid pointsPrice" })
    }
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { pointsPrice: val },
      { new: true }
    )
    if (!product) return res.status(404).json({ error: "Product not found" })
    res.json({ success: true, product })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/*------- 启动服务器 ----------*/
const PORT = 3000
const HOST = "0.0.0.0"

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running at http://${HOST}:${PORT}`)
  console.log("\n" + "=".repeat(50))
  console.log("🚀 Server is running!")
  console.log("=".repeat(50))
  console.log(`📍 Server address: http://${HOST}:${PORT}`)
  console.log(`📤 Upload frontend: http://${HOST}:${PORT}/MediaUploader.html`)
  console.log(`🛒 Shop frontend: http://${HOST}:${PORT}/minecraft-shop.html`)
  console.log(`📚 Read products API: http://${HOST}:${PORT}/products`)
  console.log(`💳 Create order API: http://${HOST}:${PORT}/api/pay/create`)
  console.log("=".repeat(50) + "\n")
})