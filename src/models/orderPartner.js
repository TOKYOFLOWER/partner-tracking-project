const fs = require("fs");
const path = require("path");
const product = require("./product");

const DATA_PATH = path.join(__dirname, "../../data/orders.json");

function loadAll() {
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  return JSON.parse(raw);
}

function saveAll(orders) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(orders, null, 2), "utf-8");
}

function findByOrderId(orderId) {
  const orders = loadAll();
  return orders.find((o) => o.order_id === orderId) || null;
}

// ORD-YYYYMMDD-NNN 形式で自動採番
function generateOrderId(orders) {
  const now = new Date();
  const dateStr = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");
  const prefix = `ORD-${dateStr}-`;
  const todayOrders = orders.filter((o) => o.order_id && o.order_id.startsWith(prefix));
  const nextNum = todayOrders.length + 1;
  return prefix + String(nextNum).padStart(3, "0");
}

// items から商品マスタを参照して合計金額を計算
function calculateItemsTotal(items) {
  let total = 0;
  for (const item of items) {
    const p = product.findById(item.product_id);
    if (!p) {
      throw new Error(`商品が見つかりません: ${item.product_id}`);
    }
    total += p.price * item.qty;
  }
  return total;
}

function create(orderData) {
  const orders = loadAll();

  // order_id: 指定があればそれを使用、なければ自動採番
  const orderId = orderData.order_id || generateOrderId(orders);

  if (orders.find((o) => o.order_id === orderId)) {
    throw new Error(`Order ${orderId} already exists`);
  }

  const order = {
    order_id: orderId,
    ordered_at: orderData.ordered_at || new Date().toISOString(),
    items: orderData.items || null,
    product_amount_after_discount: orderData.product_amount_after_discount,
    shipping_fee: orderData.shipping_fee || 0,
    fee_amount: orderData.fee_amount || 0,
    customer: orderData.customer || null,
    delivery: orderData.delivery || null,
    payment_method: orderData.payment_method || null,
    partner_id: orderData.partner_id || null,
    partner_tracked_at: orderData.partner_tracked_at || null,
    achievement_status: "pending",
    tracking_number: null,
    shipped_at: null,
  };
  orders.push(order);
  saveAll(orders);
  return order;
}

function updateShipped(orderId, trackingNumber) {
  const orders = loadAll();
  const order = orders.find((o) => o.order_id === orderId);
  if (!order) return null;
  order.tracking_number = trackingNumber;
  order.shipped_at = new Date().toISOString();
  order.achievement_status = "confirmed";
  saveAll(orders);
  return order;
}

function updateCancelled(orderId) {
  const orders = loadAll();
  const order = orders.find((o) => o.order_id === orderId);
  if (!order) return null;
  order.achievement_status = "cancelled";
  saveAll(orders);
  return order;
}

module.exports = { loadAll, findByOrderId, create, updateShipped, updateCancelled, calculateItemsTotal };
