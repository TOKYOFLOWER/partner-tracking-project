const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");

const partnerRoutes = require("./routes/partner");
const orderRoutes = require("./routes/order");
const aggregateRoutes = require("./routes/aggregate");
const productRoutes = require("./routes/product");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: [
    "http://localhost:5500",
    "http://localhost:5501",
    "http://127.0.0.1:5500",
    "http://127.0.0.1:5501",
  ],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// 静的ファイル配信（スニペットテスト用）
app.use("/snippet", express.static(path.join(__dirname, "../snippet")));

// API ルート
app.use("/api/partner", partnerRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/aggregate", aggregateRoutes);
app.use("/api/product", productRoutes);

// テスト用トップページ
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"><title>Partner Tracking Test</title></head>
<body>
  <h1>Partner Tracking System - Phase 1</h1>
  <p>Cookie partner_id: <strong id="pid">-</strong></p>
  <p>Cookie partner_tracked_at: <strong id="pta">-</strong></p>
  <h2>Test Links</h2>
  <ul>
    <li><a href="/?id=ptn0001">?id=ptn0001 (active)</a></li>
    <li><a href="/?id=ptn0002">?id=ptn0002 (active)</a></li>
    <li><a href="/?id=ptn0003">?id=ptn0003 (inactive - should not set cookie)</a></li>
    <li><a href="/?id=ptn9999">?id=ptn9999 (not found - should not set cookie)</a></li>
  </ul>
  <script src="/snippet/partner-tracking.js"></script>
  <script>
    document.getElementById('pid').textContent = document.cookie.replace(/(?:(?:^|.*;\\s*)partner_id\\s*=\\s*([^;]*).*$)|^.*$/, "$1") || '(none)';
    document.getElementById('pta').textContent = document.cookie.replace(/(?:(?:^|.*;\\s*)partner_tracked_at\\s*=\\s*([^;]*).*$)|^.*$/, "$1") || '(none)';
  </script>
</body>
</html>
  `);
});

app.listen(PORT, () => {
  console.log("Partner Tracking Server running on http://localhost:" + PORT);
});
