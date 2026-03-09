const express = require("express");
const router = express.Router();
const product = require("../models/product");

// 商品一覧（in_stock: true のみ、sort_order 昇順）
// GET /api/product/list
router.get("/list", (req, res) => {
  const products = product.listInStock();
  res.json(products);
});

// 商品詳細
// GET /api/product/:id
router.get("/:id", (req, res) => {
  const item = product.findById(req.params.id);
  if (!item) return res.status(404).json({ error: "product not found" });
  res.json(item);
});

module.exports = router;
