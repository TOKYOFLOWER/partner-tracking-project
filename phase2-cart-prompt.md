# Phase 2 カートフロントエンド構築 - Claude Code 指示書

## 前提

- Phase 1（パートナー追跡API）は実装済み・テスト済み
- Express サーバーが `src/server.js` で動作中
- データは JSON ファイルベース（`data/` 配下）
- 既存の API: パートナー検証、注文CRUD、集計

## ゴール

お客様が使うカート画面を構築する。
GitHub Pages で静的ホスティングする前提の HTML + JavaScript。

---

## 指示 1/6：商品データとAPIの追加

### 1-1. 商品マスタ作成

`data/products.json` を新規作成。以下のサンプルデータを入れる:

```json
[
  {
    "product_id": "prod001",
    "name": "季節のアレンジメント S",
    "description": "季節の花を使ったおまかせアレンジメント。コンパクトで飾りやすいサイズ。",
    "price": 3300,
    "tax_included": true,
    "image": "images/arrangement-s.jpg",
    "category": "arrangement",
    "in_stock": true,
    "sort_order": 1
  },
  {
    "product_id": "prod002",
    "name": "季節のアレンジメント M",
    "description": "ボリュームのある華やかなアレンジメント。贈り物に最適。",
    "price": 5500,
    "tax_included": true,
    "image": "images/arrangement-m.jpg",
    "category": "arrangement",
    "in_stock": true,
    "sort_order": 2
  },
  {
    "product_id": "prod003",
    "name": "季節のアレンジメント L",
    "description": "特別な日に。豪華なアレンジメント。",
    "price": 8800,
    "tax_included": true,
    "image": "images/arrangement-l.jpg",
    "category": "arrangement",
    "in_stock": true,
    "sort_order": 3
  },
  {
    "product_id": "prod004",
    "name": "おまかせ花束",
    "description": "季節の花でお作りする花束。ラッピング込み。",
    "price": 4400,
    "tax_included": true,
    "image": "images/bouquet.jpg",
    "category": "bouquet",
    "in_stock": true,
    "sort_order": 4
  },
  {
    "product_id": "prod005",
    "name": "観葉植物 ポトス",
    "description": "育てやすい定番の観葉植物。4号鉢。",
    "price": 1650,
    "tax_included": true,
    "image": "images/pothos.jpg",
    "category": "plant",
    "in_stock": true,
    "sort_order": 5
  },
  {
    "product_id": "prod006",
    "name": "多肉植物 寄せ植え",
    "description": "おしゃれな器の多肉植物セット。手間いらず。",
    "price": 2750,
    "tax_included": true,
    "image": "images/succulent.jpg",
    "category": "plant",
    "in_stock": false,
    "sort_order": 6
  }
]
```

### 1-2. 商品 API 追加

`src/routes/product.js` を新規作成:

- `GET /api/product/list` → `in_stock: true` のみ返す。sort_order 昇順。
- `GET /api/product/:id` → 指定IDの商品を返す。
- `data/products.json` を読み込むモデル `src/models/product.js` も作成。

`src/server.js` にルートを追加登録する。

### 1-3. CORS 設定追加

`src/server.js` に cors ミドルウェアを追加:

```javascript
const cors = require('cors');
app.use(cors({
  origin: function(origin, callback) {
    // 開発時は全て許可、本番では GitHub Pages ドメインに制限
    const allowedOrigins = [
      'http://localhost:8080',
      'http://127.0.0.1:5500',
      'http://localhost:5500'
    ];
    // origin が undefined (同一オリジン) または許可リストに含まれる場合
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Phase 2 開発中は全許可。本番で制限する。
    }
  },
  credentials: true
}));
```

`npm install cors` を実行。

---

## 指示 2/6：POST /api/order の拡張

既存の `src/routes/order.js` の POST エンドポイントを拡張する。

### 変更点

1. **items 配列の受付**: リクエストボディに `items` を追加で受け付ける
2. **サーバー側金額検証**: items から商品マスタを参照して合計金額を再計算し、
   クライアントから送られた `product_amount_after_discount` と一致するか検証
3. **customer 情報の保存**: 注文データに顧客情報を追加
4. **partner_id のボディ受付**: Cookie に加えてリクエストボディの `partner_id` も受け付ける（ボディ優先）
5. **order_id の自動採番**: `ORD-YYYYMMDD-NNN` 形式で自動生成

### リクエスト形式

```json
{
  "items": [
    { "product_id": "prod001", "qty": 1 },
    { "product_id": "prod002", "qty": 2 }
  ],
  "product_amount_after_discount": 14300,
  "shipping_fee": 0,
  "fee_amount": 330,
  "payment_method": "cod",
  "customer": {
    "name": "山田 太郎",
    "name_kana": "ヤマダ タロウ",
    "zip": "150-0001",
    "prefecture": "東京都",
    "city": "渋谷区",
    "address1": "神宮前1-2-3",
    "address2": "ABCビル 301",
    "phone": "090-1234-5678",
    "email": "yamada@example.com"
  },
  "delivery": {
    "date": "2026-03-15",
    "time_slot": "14-16"
  },
  "partner_id": "ptn0001",
  "partner_tracked_at": "2026-03-10T10:00:00.000Z"
}
```

### レスポンス

```json
{
  "success": true,
  "order_id": "ORD-20260310-001",
  "total": 14630
}
```

### 金額検証ロジック

```
1. items の各 product_id で products.json から price を取得
2. price × qty の合計を計算
3. リクエストの product_amount_after_discount と比較
4. 不一致なら 400 エラー（"金額が一致しません"）
```

### 送料ルール

```
商品合計 ≥ 10000 → 送料 0
商品合計 < 10000 → 送料 550
```

### 既存機能との互換

Phase 1 形式のリクエスト（items なし、product_amount_after_discount 直指定）も
引き続き動作するよう、items がない場合は従来の処理を維持すること。

---

## 指示 3/6：フロントエンド共通モジュール

`web/` フォルダ以下に以下のファイルを作成する。

### 3-1. web/js/config.js

```javascript
// API エンドポイント設定
// 開発時: localhost:3000
// 本番時: ここを本番APIのURLに変更する
const CONFIG = {
  API_BASE: 'http://localhost:3000',
  PARTNER_COOKIE_DAYS: 30,
  FREE_SHIPPING_THRESHOLD: 10000,
  SHIPPING_FEE: 550,
  COD_FEE: 330
};
```

### 3-2. web/js/api.js

API 通信ラッパー。以下の関数を export:

- `fetchProducts()` → GET /api/product/list
- `fetchProduct(id)` → GET /api/product/:id
- `validatePartner(id)` → GET /api/partner/validate?id=...
- `submitOrder(orderData)` → POST /api/order
- 共通のエラーハンドリング（ネットワークエラー、サーバーエラー）

### 3-3. web/js/partner.js

パートナー追跡の localStorage 管理:

- `initPartnerTracking()`: URL の `?id=xxx` を検出 → API で検証 → 有効なら localStorage に保存。既に有効なパートナー情報がある場合は上書きしない（最初の紹介者を優先）。
- `getPartnerInfo()`: localStorage から取得。期限切れなら null。
- `clearPartnerInfo()`: 削除。

保存形式:
```json
{
  "partner_id": "ptn0001",
  "tracked_at": "2026-03-10T10:00:00.000Z",
  "expires_at": "2026-04-09T10:00:00.000Z"
}
```

### 3-4. web/js/cart.js

カート操作モジュール:

- `getCart()`: localStorage からカート取得。
- `addToCart(productId, qty)`: 追加。既存なら数量加算。
- `updateQty(productId, qty)`: 数量変更。0以下で削除。
- `removeFromCart(productId)`: 削除。
- `clearCart()`: 空にする。
- `getCartCount()`: 合計アイテム数。
- `calculateTotals(products)`: 商品マスタを参照して小計・送料・合計を計算。

保存形式:
```json
{
  "items": [
    { "product_id": "prod001", "qty": 1 }
  ],
  "updated_at": "2026-03-10T10:00:00.000Z"
}
```

### 3-5. web/js/validation.js

フォームバリデーション:

- `validateCustomerForm(data)`: 必須項目チェック、電話番号形式、メール形式、郵便番号形式。
- エラーメッセージを配列で返す。

---

## 指示 4/6：商品一覧ページ（web/index.html）

### 要件

- Tailwind CSS（CDN）と Alpine.js（CDN）を使用。
- レスポンシブ：モバイル1列、タブレット2列、PC3列のグリッド。
- カテゴリフィルター：「すべて」「アレンジメント」「花束」「観葉植物」のタブ。
- 商品カード：画像、商品名、説明（1行に省略）、価格、「カートに入れる」ボタン。
- 在庫切れ商品は「SOLD OUT」表示でボタン無効化。
- ヘッダーにカートアイコン + バッジ（件数表示）。
- ページ読み込み時に `partner.js` の `initPartnerTracking()` を実行。
- 「カートに入れる」押下でトースト通知（「カートに追加しました」）。

### 商品画像について

- 画像がない場合のフォールバック用プレースホルダーを CSS で用意（花のアイコンなど）。
- `<img>` の onerror でフォールバック表示。

### デザインの方向性

- 花屋なので、白背景 + 淡いグリーン系のアクセントカラー。
- 上品で清潔感のあるデザイン。
- フォントは sans-serif。日本語がきれいに表示されるもの。

---

## 指示 5/6：カートページ（web/cart.html）

### 要件

- カート内容を一覧表示（商品画像サムネイル、商品名、単価、数量 +/- 、小計、削除ボタン）。
- 数量変更でリアルタイムに小計・合計を再計算。
- 送料表示（¥10,000以上で「無料」、未満で「¥550」）。
- 「注文手続きへ」ボタン → order.html に遷移。
- 「買い物を続ける」リンク → index.html に遷移。
- カートが空の場合は「カートは空です」メッセージと「商品一覧へ」リンク。
- ヘッダーは index.html と共通デザイン。

---

## 指示 6/6：注文入力・完了ページ

### 注文入力（web/order.html）

- お届け先フォーム: 名前、フリガナ、郵便番号、都道府県（select）、市区町村、番地、建物名、電話番号、メール。
- お届け希望日: 最短3日後〜14日後の日付 select。時間帯: 午前中 / 12-14 / 14-16 / 16-18 / 18-20 / 指定なし。
- お支払い方法: 代金引換（手数料¥330）/ 銀行振込（前払い）のラジオボタン。代引選択時は手数料を合計に加算。
- 注文内容確認エリア: カートの内容を読み取り専用で表示。
- バリデーション: 全必須項目の入力チェック。不備があればエラー表示。
- 「注文を確定する」ボタン → api.js で POST /api/order → 成功なら complete.html に遷移。
  - 遷移時に order_id を URL パラメータまたは sessionStorage で渡す。
  - 失敗時はエラーメッセージ表示。
- 確定ボタンは二重送信防止（ボタン無効化 + ローディング表示）。

### 注文完了（web/complete.html）

- 「ご注文ありがとうございます」メッセージ。
- 注文番号を表示。
- 注文サマリー（商品名、数量、合計金額）を表示。
- 「トップに戻る」ボタン。
- カートを clearCart() で空にする。

---

## 技術的な注意事項

### Alpine.js の使い方

```html
<!-- CDN で読み込み -->
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>

<!-- x-data でスコープ定義、x-text でバインド、@click でイベント -->
<div x-data="productList()">
  <template x-for="product in filteredProducts" :key="product.product_id">
    <div class="product-card">
      <h3 x-text="product.name"></h3>
      <p x-text="product.price.toLocaleString() + '円'"></p>
      <button @click="addToCart(product.product_id)">カートに入れる</button>
    </div>
  </template>
</div>
```

### ES Modules は使わない

GitHub Pages + Alpine.js 構成では、`<script type="module">` ではなく
通常の `<script>` タグで読み込む。各 JS ファイルは グローバル変数 or window オブジェクトに関数を公開する。

読み込み順序:
```html
<script src="js/config.js"></script>
<script src="js/api.js"></script>
<script src="js/partner.js"></script>
<script src="js/cart.js"></script>
<script src="js/validation.js"></script>
<!-- Alpine.js は defer なので最後に初期化される -->
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
<!-- ページ固有の処理 -->
<script src="js/app.js"></script>
```

### テスト方法

- ローカル開発: VS Code の Live Server 拡張で `web/` フォルダを起動（port 5500）
- Express サーバーは別ターミナルで `npm start`（port 3000）
- ブラウザで `http://localhost:5500/?id=ptn0001` にアクセスして動作確認

### GitHub Pages デプロイ

リポジトリの Settings > Pages で:
- Source: Deploy from a branch
- Branch: main、フォルダ: `/web`（または /docs にリネーム）

---

## チェックリスト

各指示の完了後に確認:

- [ ] `npm start` でサーバーが起動する
- [ ] `GET /api/product/list` で商品一覧が返る
- [ ] ブラウザで `index.html` を開いて商品が表示される
- [ ] `?id=ptn0001` アクセスで localStorage にパートナー情報が保存される
- [ ] 商品をカートに追加できる
- [ ] cart.html でカート内容が表示・編集できる
- [ ] order.html でフォーム入力・バリデーションが動作する
- [ ] 注文送信で POST /api/order が成功する
- [ ] complete.html に注文番号が表示される
- [ ] パートナー経由の注文に partner_id が紐付いている（orders.json で確認）
- [ ] パートナーなしの注文も正常に通る
- [ ] レスポンシブ表示（モバイル幅）で崩れない
