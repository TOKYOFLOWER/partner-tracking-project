const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "../../data/partner_master.json");

function loadAll() {
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  return JSON.parse(raw);
}

function saveAll(partners) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(partners, null, 2), "utf-8");
}

function findById(partnerId) {
  const partners = loadAll();
  return partners.find((p) => p.partner_id === partnerId) || null;
}

function isValid(partnerId) {
  const partner = findById(partnerId);
  return partner !== null && partner.status === "active";
}

function isValidFormat(partnerId) {
  return /^ptn\d{4,}$/.test(partnerId);
}

module.exports = { loadAll, saveAll, findById, isValid, isValidFormat };
