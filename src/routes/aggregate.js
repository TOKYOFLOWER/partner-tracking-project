const express = require("express");
const router = express.Router();
const orderPartner = require("../models/orderPartner");
const partnerMaster = require("../models/partnerMaster");

// 集計 API
// GET /api/aggregate?month=2026-03
router.get("/", (req, res) => {
  const targetMonth = req.query.month; // YYYY-MM 形式（省略時は当月）

  const now = new Date();
  const year = targetMonth ? parseInt(targetMonth.split("-")[0]) : now.getFullYear();
  const month = targetMonth ? parseInt(targetMonth.split("-")[1]) - 1 : now.getMonth();

  const orders = orderPartner.loadAll();

  // 対象月の全注文を抽出
  const allMonthlyOrders = orders.filter((o) => {
    const d = new Date(o.ordered_at);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  // パートナー紐付き注文
  const partnerOrders = allMonthlyOrders.filter((o) => o.partner_id);

  const calcAmount = (o) => o.product_amount_after_discount + (o.shipping_fee || 0) + (o.fee_amount || 0);

  const confirmed = allMonthlyOrders.filter((o) => o.achievement_status === "confirmed");
  const pending = allMonthlyOrders.filter((o) => o.achievement_status === "pending");
  const cancelled = allMonthlyOrders.filter((o) => o.achievement_status === "cancelled");

  // パートナーマスタからパートナー名取得用マップ
  const partners = partnerMaster.loadAll();
  const partnerNameMap = {};
  for (const p of partners) {
    partnerNameMap[p.partner_id] = p.partner_name;
  }

  // パートナー別集計（partner_id=null は「直接注文」）
  const byPartnerMap = {};
  for (const o of allMonthlyOrders) {
    const key = o.partner_id || "__direct__";
    if (!byPartnerMap[key]) {
      byPartnerMap[key] = {
        partner_id: o.partner_id || null,
        partner_name: o.partner_id ? (partnerNameMap[o.partner_id] || o.partner_id) : "直接注文",
        total_count: 0,
        confirmed: { count: 0, amount: 0 },
        pending: { count: 0, amount: 0 },
        cancelled: { count: 0, amount: 0 },
      };
    }
    const entry = byPartnerMap[key];
    entry.total_count += 1;
    const amount = calcAmount(o);
    if (o.achievement_status === "confirmed") {
      entry.confirmed.count += 1;
      entry.confirmed.amount += amount;
    } else if (o.achievement_status === "pending") {
      entry.pending.count += 1;
      entry.pending.amount += amount;
    } else if (o.achievement_status === "cancelled") {
      entry.cancelled.count += 1;
      entry.cancelled.amount += amount;
    }
  }

  res.json({
    month: `${year}-${String(month + 1).padStart(2, "0")}`,
    total_orders: allMonthlyOrders.length,
    partner_orders: partnerOrders.length,
    confirmed: { count: confirmed.length, amount: confirmed.reduce((s, o) => s + calcAmount(o), 0) },
    pending: { count: pending.length, amount: pending.reduce((s, o) => s + calcAmount(o), 0) },
    cancelled: { count: cancelled.length, amount: cancelled.reduce((s, o) => s + calcAmount(o), 0) },
    by_partner: Object.values(byPartnerMap),
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
