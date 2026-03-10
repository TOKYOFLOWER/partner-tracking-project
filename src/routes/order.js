const express = require("express");
const router = express.Router();
const orderPartner = require("../models/orderPartner");
const partnerMaster = require("../models/partnerMaster");

// 注文作成（パートナー紐付け付き）
// POST /api/order
router.post("/", (req, res) => {
  const {
    order_id, items, product_amount_after_discount,
    shipping_fee, fee_amount, payment_method,
    customer, delivery, ordered_at,
    partner_id: bodyPartnerId, partner_tracked_at: bodyTrackedAt
  } = req.body;

  // Phase 1 互換: items なしの場合は order_id と product_amount_after_discount が必須
  if (!items && (!order_id || product_amount_after_discount === undefined)) {
    return res.status(400).json({ error: "order_id and product_amount_after_discount are required" });
  }

  // items がある場合: サーバー側で金額を自動計算
  let resolvedAmount = product_amount_after_discount;
  if (items) {
    try {
      const calculatedTotal = orderPartner.calculateItemsTotal(items);
      if (resolvedAmount === undefined) {
        // クライアントが金額を送っていない場合はサーバー側で算出
        resolvedAmount = calculatedTotal;
      } else if (calculatedTotal !== resolvedAmount) {
        // クライアントが金額を送ってきた場合は検証
        return res.status(400).json({
          error: "金額が一致しません",
          expected: calculatedTotal,
          received: resolvedAmount
        });
      }
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  // 送料: items がある場合はサーバー側ルールで算出
  let resolvedShippingFee = shipping_fee;
  if (items) {
    resolvedShippingFee = resolvedAmount >= 10000 ? 0 : 550;
  }

  // partner_id: ボディ優先、なければ Cookie
  const cookiePartnerId = req.cookies.partner_id || null;
  const cookieTrackedAt = req.cookies.partner_tracked_at || null;
  const rawPartnerId = bodyPartnerId || cookiePartnerId;
  const rawTrackedAt = bodyTrackedAt || cookieTrackedAt;

  // partner_id がある場合、マスタで有効か確認
  let validPartnerId = null;
  let validTrackedAt = null;
  if (rawPartnerId && partnerMaster.isValid(rawPartnerId)) {
    validPartnerId = rawPartnerId;
    validTrackedAt = rawTrackedAt;
  }

  try {
    const order = orderPartner.create({
      order_id,
      ordered_at,
      items,
      product_amount_after_discount: resolvedAmount,
      shipping_fee: resolvedShippingFee,
      fee_amount: fee_amount || 0,
      payment_method,
      customer,
      delivery,
      partner_id: validPartnerId,
      partner_tracked_at: validTrackedAt,
    });

    const total = order.product_amount_after_discount +
      (order.shipping_fee || 0) + (order.fee_amount || 0);

    res.status(201).json({
      success: true,
      order_id: order.order_id,
      total
    });
  } catch (err) {
    res.status(409).json({ error: err.message });
  }
});

// 注文一覧（フィルター対応）
// GET /api/order/list?status=pending&partner_id=ptn0001&month=2026-03&search=山田
router.get("/list", (req, res) => {
  let orders = orderPartner.loadAll();
  const { status, partner_id, month, search } = req.query;

  // ステータス絞り込み
  if (status) {
    orders = orders.filter((o) => o.achievement_status === status);
  }

  // パートナー絞り込み
  if (partner_id) {
    orders = orders.filter((o) => o.partner_id === partner_id);
  }

  // 月絞り込み（ordered_at で判定）
  if (month) {
    const [y, m] = month.split("-").map(Number);
    orders = orders.filter((o) => {
      const d = new Date(o.ordered_at);
      return d.getFullYear() === y && d.getMonth() === m - 1;
    });
  }

  // 検索（注文番号 or 顧客名で部分一致）
  if (search) {
    const q = search.toLowerCase();
    orders = orders.filter((o) => {
      const matchId = o.order_id && o.order_id.toLowerCase().includes(q);
      const matchName = o.customer && o.customer.name && o.customer.name.toLowerCase().includes(q);
      return matchId || matchName;
    });
  }

  // サマリー（フィルター適用後の全件から集計）
  const summary = {
    total: orders.length,
    pending: orders.filter((o) => o.achievement_status === "pending").length,
    confirmed: orders.filter((o) => o.achievement_status === "confirmed").length,
    cancelled: orders.filter((o) => o.achievement_status === "cancelled").length,
  };

  res.json({ orders, summary });
});

// 注文詳細
// GET /api/order/:id
router.get("/:id", (req, res) => {
  const order = orderPartner.findByOrderId(req.params.id);
  if (!order) return res.status(404).json({ error: "order not found" });
  res.json(order);
});

// 送状番号入力 → 出荷完了（confirmed）
// PATCH /api/order/:id/ship
router.patch("/:id/ship", (req, res) => {
  const { tracking_number } = req.body;

  if (!tracking_number) {
    return res.status(400).json({ error: "tracking_number is required" });
  }

  const order = orderPartner.updateShipped(req.params.id, tracking_number);
  if (!order) return res.status(404).json({ error: "order not found" });
  res.json(order);
});

// キャンセル
// PATCH /api/order/:id/cancel
router.patch("/:id/cancel", (req, res) => {
  const order = orderPartner.updateCancelled(req.params.id);
  if (!order) return res.status(404).json({ error: "order not found" });
  res.json(order);
});

module.exports = router;
