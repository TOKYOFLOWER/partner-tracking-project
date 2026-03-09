const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "../../data/products.json");

function loadAll() {
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  return JSON.parse(raw);
}

function findById(productId) {
  const products = loadAll();
  return products.find((p) => p.product_id === productId) || null;
}

function listInStock() {
  const products = loadAll();
  return products
    .filter((p) => p.in_stock)
    .sort((a, b) => a.sort_order - b.sort_order);
}

module.exports = { loadAll, findById, listInStock };
