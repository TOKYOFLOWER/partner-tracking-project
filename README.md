# 販売パートナー追跡システム（Phase 1）

販売パートナー経由の注文をトラッキングし、成果を集計するシステム。

## 起動方法

```bash
npm install
npm start
```

サーバーが `http://localhost:3000` で起動します。

開発時（ファイル変更で自動再起動）:
```bash
npm run dev
```

## フォルダ構成

```
src/
  server.js                  # Express サーバー
  routes/
    partner.js               # パートナー検証 API
    order.js                 # 注文 CRUD API
    aggregate.js             # 集計 API
  models/
    partnerMaster.js         # パートナーマスタ操作
    orderPartner.js          # 注文データ操作
snippet/
  partner-tracking.js        # LP/商品ページ設置用 JS
data/
  partner_master.json        # パートナーマスタ
  orders.json                # 注文データ
docs/                        # 企画概要・要件定義
specs/                       # データ設計・表示項目
prompts/                     # Claude Code 指示書
```

## API 一覧

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/partner/validate?id=ptn0001` | パートナーID有効性検証 |
| GET | `/api/partner/list` | パートナーマスタ一覧 |
| POST | `/api/order` | 注文作成（Cookie の partner_id を自動紐付け） |
| GET | `/api/order/list` | 注文一覧 |
| GET | `/api/order/:id` | 注文詳細 |
| PATCH | `/api/order/:id/ship` | 送状番号入力 → 成果確定 (confirmed) |
| PATCH | `/api/order/:id/cancel` | キャンセル (cancelled) |
| GET | `/api/aggregate?month=2026-03` | 月別集計（省略時は当月） |
| GET | `/api/aggregate/monthly` | 月別推移 |

## 確認手順

### 1. パートナーID検証

```bash
# active なパートナー → valid: true
curl http://localhost:3000/api/partner/validate?id=ptn0001

# inactive → valid: false
curl http://localhost:3000/api/partner/validate?id=ptn0003

# 存在しない → valid: false
curl http://localhost:3000/api/partner/validate?id=ptn9999
```

### 2. Cookie 設定（ブラウザ）

`http://localhost:3000/?id=ptn0001` にアクセスすると、JS スニペットがパートナーIDを検証し Cookie に保存します。ページ上に Cookie の値が表示されます。

### 3. 注文作成

```bash
# パートナー紐付きの注文
curl -X POST http://localhost:3000/api/order \
  -H "Content-Type: application/json" \
  -H "Cookie: partner_id=ptn0001; partner_tracked_at=2026-03-09T10:00:00.000Z" \
  -d '{"order_id":"ORD-001","product_amount_after_discount":5000,"shipping_fee":500}'

# パートナーなしの注文
curl -X POST http://localhost:3000/api/order \
  -H "Content-Type: application/json" \
  -d '{"order_id":"ORD-002","product_amount_after_discount":3000}'
```

### 4. 出荷完了（送状番号入力）

```bash
curl -X PATCH http://localhost:3000/api/order/ORD-001/ship \
  -H "Content-Type: application/json" \
  -d '{"tracking_number":"1234-5678-9012"}'
```

### 5. キャンセル

```bash
curl -X PATCH http://localhost:3000/api/order/ORD-002/cancel
```

### 6. 集計確認

```bash
# 当月の集計
curl http://localhost:3000/api/aggregate

# 月別推移
curl http://localhost:3000/api/aggregate/monthly
```

## データ設計

### パートナーマスタ (`data/partner_master.json`)

| カラム | 型 | 説明 |
|--------|----|------|
| partner_id | string | `ptn0001` 形式 |
| partner_name | string | 表示名 |
| status | string | `active` / `inactive` |
| commission_plan | string | Phase 3 用 |
| created_at | datetime | 登録日時 |
| memo | string | 備考 |

### 注文データ (`data/orders.json`)

| カラム | 型 | 説明 |
|--------|----|------|
| order_id | string | 注文番号 |
| ordered_at | datetime | 注文日時 |
| product_amount_after_discount | number | 値引き後商品代（集計対象） |
| shipping_fee | number | 送料（集計対象外） |
| fee_amount | number | 手数料（集計対象外） |
| partner_id | string | 紹介元パートナーID |
| partner_tracked_at | datetime | Cookie セット日時 |
| achievement_status | string | `pending` / `confirmed` / `cancelled` |
| tracking_number | string | 送状番号 |
| shipped_at | datetime | 出荷完了日時 |
