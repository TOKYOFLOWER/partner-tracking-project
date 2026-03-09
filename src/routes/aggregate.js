const express = require("express");
const router = express.Router();
const orderPartner = require("../models/orderPartner");

// 集計 API
// GET /api/aggregate?month=2026-03
router.get("/", (req, res) => {
  const targetMonth = req.query.month; // YYYY-MM 形式（省略時は当月）

  const now = new Date();
  const year = targetMonth ? parseInt(targetMonth.split("-")[0]) : now.getFullYear();
  const month = targetMonth ? parseInt(targetMonth.split("-")[1]) - 1 : now.getMonth();

  const orders = orderPartner.loadAll();

  // 対象月のパートナー紐付き注文を抽出
  const monthlyOrders = orders.filter((o) => {
    if (!o.partner_id) return false;
    const d = new Date(o.ordered_at);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const confirmed = monthlyOrders.filter((o) => o.achievement_status === "confirmed");
  const pending = monthlyOrders.filter((o) => o.achievement_status === "pending");
  const cancelled = monthlyOrders.filter((o) => o.achievement_status === "cancelled");

  // 確定売上: confirmed の product_amount_after_discount 合計
  const confirmedSales = confirmed.reduce((sum, o) => sum + o.product_amount_after_discount, 0);

  // パートナー別集計
  const byPartner = {};
  for (const o of confirmed) {
    if (!byPartner[o.partner_id]) {
      byPartner[o.partner_id] = { partner_id: o.partner_id, confirmed_sales: 0, confirmed_count: 0 };
    }
    byPartner[o.partner_id].confirmed_sales += o.product_amount_after_discount;
    byPartner[o.partner_id].confirmed_count += 1;
  }

  res.json({
    target_month: `${year}-${String(month + 1).padStart(2, "0")}`,
    summary: {
      confirmed_sales: confirmedSales,
      confirmed_count: confirmed.length,
      pending_count: pending.length,
      cancelled_count: cancelled.length,
    },
    by_partner: Object.values(byPartner),
  });
});

// 月別推移 API
// GET /api/aggregate/monthly
router.get("/monthly", (req, res) => {
  const orders = orderPartner.loadAll();

  const monthlyMap = {};
  for (const o of orders) {
    if (!o.partner_id) continue;
    const d = new Date(o.ordered_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    if (!monthlyMap[key]) {
      monthlyMap[key] = { month: key, confirmed_sales: 0, confirmed_count: 0, pending_count: 0, cancelled_count: 0 };
    }

    if (o.achievement_status === "confirmed") {
      monthlyMap[key].confirmed_sales += o.product_amount_after_discount;
      monthlyMap[key].confirmed_count += 1;
    } else if (o.achievement_status === "pending") {
      monthlyMap[key].pending_count += 1;
    } else if (o.achievement_status === "cancelled") {
      monthlyMap[key].cancelled_count += 1;
    }
  }

  const result = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));
  res.json(result);
});

module.exports = router;
