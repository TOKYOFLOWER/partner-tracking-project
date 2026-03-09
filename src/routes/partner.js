const express = require("express");
const router = express.Router();
const partnerMaster = require("../models/partnerMaster");

// パートナーID検証 API
// GET /api/partner/validate?id=ptn0001
router.get("/validate", (req, res) => {
  const partnerId = req.query.id;

  if (!partnerId) {
    return res.json({ valid: false, reason: "id parameter is required" });
  }

  if (!partnerMaster.isValidFormat(partnerId)) {
    return res.json({ valid: false, reason: "invalid format" });
  }

  if (!partnerMaster.isValid(partnerId)) {
    return res.json({ valid: false, reason: "not found or inactive" });
  }

  const partner = partnerMaster.findById(partnerId);
  return res.json({ valid: true, partner_id: partner.partner_id, partner_name: partner.partner_name });
});

// パートナーマスタ一覧
// GET /api/partner/list
router.get("/list", (req, res) => {
  const partners = partnerMaster.loadAll();
  res.json(partners);
});

module.exports = router;
