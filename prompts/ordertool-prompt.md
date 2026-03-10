# 注文管理ツール（ordertool）構築 - Claude Code 指示書

## 前提

- Phase 1（API）+ Phase 2（カートフロントエンド）は実装済み
- Express サーバーが localhost:3000 で動作中
- data/orders.json に注文データが入っている
- 技術スタック: HTML + vanilla JS + Tailwind CSS（CDN）+ Alpine.js（CDN）
- web/ フォルダのカートと同じパターンで ordertool/ に管理画面を作る

## ゴール

注文一覧・詳細確認・出荷処理・キャンセル・集計を行う管理画面を構築する。

---

## 指示 1/5：API の拡張

### 1-1. GET /api/order/list にフィルター機能を追加

`src/routes/order.js` を修正。クエリパラメータで絞り込みできるようにする:

```
GET /api/order/list?status=pending&partner_id=ptn0001&month=2026-03&search=山田
```

パラメータ（すべて任意）:
- `status`: pending / confirmed / cancelled で絞り込み
- `partner_id`: 特定パートナーの注文のみ
- `month`: YYYY-MM 形式。その月の注文のみ（ordered_at で判定）
- `search`: 注文番号 or 顧客名（customer.name）で部分一致検索
- パラメータなしなら全件返す（従来通り）

レスポンスに件数サマリーも追加:
```json
{
  "orders": [...],
  "summary": {
    "total": 12,
    "pending": 5,
    "confirmed": 6,
    "cancelled": 1
  }
}
```

### 1-2. GET /api/aggregate にパートナー別集計を追加

`src/routes/aggregate.js` を修正。既存のレスポンスに `by_partner` を追加:

```json
{
  "month": "2026-03",
  "total_orders": 12,
  "partner_orders": 8,
  "confirmed": { "count": 6, "amount": 86400 },
  "pending": { "count": 5, "amount": 32100 },
  "cancelled": { "count": 1, "amount": 5500 },
  "by_partner": [
    {
      "partner_id": "ptn0001",
      "partner_name": "提携店A",
      "total_count": 5,
      "confirmed": { "count": 3, "amount": 42000 },
      "pending": { "count": 2, "amount": 12000 },
      "cancelled": { "count": 0, "amount": 0 }
    }
  ]
}
```

partner_name は data/partner_master.json から取得する。
partner_id が null の注文は「直接注文」として集計に含める。

### 1-3. CORS に ordertool の開発ポートを追加

ordertool は port 5501 で起動する想定。
`src/server.js` の CORS 許可リストに `http://localhost:5501` を追加。

---

## 指示 2/5：管理画面の共通モジュール

`ordertool/` フォルダに以下を作成。

### 2-1. ordertool/js/admin-config.js

```javascript
const ADMIN_CONFIG = {
  API_BASE: 'http://localhost:3000'
};
```

### 2-2. ordertool/js/admin-api.js

API 通信ラッパー。以下の関数を公開:

- `AdminAPI.fetchOrders(filters)` → GET /api/order/list（filters をクエリパラメータに変換）
- `AdminAPI.fetchOrder(orderId)` → GET /api/order/:id
- `AdminAPI.shipOrder(orderId, trackingNumber)` → PATCH /api/order/:id/ship
- `AdminAPI.cancelOrder(orderId)` → PATCH /api/order/:id/cancel
- `AdminAPI.fetchAggregate(month)` → GET /api/aggregate?month=YYYY-MM
- `AdminAPI.fetchMonthly()` → GET /api/aggregate/monthly
- `AdminAPI.fetchPartners()` → GET /api/partner/list

エラーハンドリング: fetch 失敗時やステータスコード 4xx/5xx 時にエラーオブジェクトを返す。

---

## 指示 3/5：注文一覧ページ（ordertool/index.html）

### 要件

- ページタイトル「注文管理」。ナビゲーションに [注文一覧] [集計] タブ。
- フィルターバー:
  - ステータス: select（すべて / pending / confirmed / cancelled）
  - パートナー: select（すべて / 各パートナーID。API の /api/partner/list から動的取得）
  - 月: input type="month"（デフォルト当月）
  - 検索: テキスト入力（注文番号 or 顧客名）
- フィルター変更時に API を再取得して表示更新。
- ステータスサマリーバー: 全件数、pending/confirmed/cancelled の件数をバッジ表示。
- 注文テーブル:
  - 列: 注文番号、注文日時（MM/DD HH:mm）、顧客名、金額（税込合計）、パートナー（なしは「-」）、ステータス（バッジ）、操作
  - ステータスバッジの色: pending=黄色(amber), confirmed=緑(green), cancelled=赤(red)
  - 操作列:
    - [詳細] ボタン → detail.html?id=注文番号 に遷移
    - [出荷] ボタン → pending の注文のみ表示。クリックで出荷モーダルを開く
    - [取消] ボタン → pending / confirmed の注文で表示。確認ダイアログ後に API 実行
- 出荷モーダル（Alpine.js で制御）:
  - 注文番号と顧客名を表示
  - 送状番号の入力欄（必須）
  - [出荷確定] ボタン → PATCH /api/order/:id/ship 実行 → 成功で一覧リロード
  - [キャンセル] ボタン → モーダルを閉じる
- キャンセル操作:
  - confirm() ダイアログで「本当にキャンセルしますか？」確認
  - PATCH /api/order/:id/cancel 実行 → 成功で一覧リロード
- データ0件時: 「注文がありません」メッセージ表示
- ローディング: API 取得中はスピナー表示

### デザイン

- 背景: 白。管理画面らしくシンプルに。
- ナビゲーション: 紺色（indigo-700）のヘッダーバー。白文字。
- テーブル: ストライプ（偶数行を薄いグレー）。hover で背景色変更。
- カート画面（web/）とは異なるカラーで、管理画面であることが分かるようにする。

---

## 指示 4/5：注文詳細ページ（ordertool/detail.html）

### 要件

- URL: `detail.html?id=ORD-20260310-001`
- ページ読み込み時にURLパラメータから order_id を取得 → API で注文データ取得。
- 表示セクション:
  1. **ヘッダー**: 注文番号、ステータスバッジ、注文日時
  2. **注文商品**: items のテーブル（商品名、数量、単価、小計）+ 商品合計・送料・手数料・合計
     - items がない場合（Phase 1 形式の注文）は product_amount_after_discount を「商品代金」として表示
  3. **お届け先**: customer 情報をフォーマットして表示。customer がない場合は「情報なし」
  4. **配送情報**: お届け希望日、時間帯、支払方法、送状番号
  5. **パートナー情報**: partner_id、パートナー名（/api/partner/list から取得）、追跡日時
     - パートナー紐付きなしの場合は「直接注文」と表示

- 操作ボタン（ステータスに応じて表示制御）:
  - pending: [出荷処理] [キャンセル] 両方表示
  - confirmed: [キャンセル] のみ表示
  - cancelled: ボタンなし

- [出荷処理] → 出荷モーダル（index.html と同じ）。成功でページリロード。
- [キャンセル] → 確認ダイアログ → 成功でページリロード。
- [← 一覧に戻る] リンク → index.html

---

## 指示 5/5：集計ページ（ordertool/aggregate.html）

### 要件

- ナビゲーションは index.html と共通（[注文一覧] [集計] タブ）。
- 月選択: input type="month"（デフォルト当月）。変更で再取得。
- **サマリーカード**（4枚横並び）:
  1. 総注文数（全件）
  2. パートナー経由件数
  3. 確定売上（confirmed の金額合計）
  4. 未確定（pending の金額合計）
- **パートナー別テーブル**:
  - 列: パートナー名、件数、確定金額、未確定金額、キャンセル金額
  - 「直接注文」行も含む
  - 金額は ¥ 付きで千区切り表示
- **月別推移グラフ**:
  - GET /api/aggregate/monthly のデータを使う
  - シンプルな棒グラフ。CSS のみで実装（ライブラリ不要）。
  - 各月の棒の高さを最大値に対する比率で計算。
  - 棒の上に金額表示。
  - 直近6ヶ月分を表示。

### グラフの実装方法（CSS棒グラフ）

```html
<!-- Alpine.js + Tailwind でシンプルに -->
<div class="flex items-end gap-2 h-48">
  <template x-for="m in monthlyData">
    <div class="flex flex-col items-center flex-1">
      <span class="text-xs" x-text="'¥' + m.amount.toLocaleString()"></span>
      <div class="w-full bg-indigo-500 rounded-t"
           :style="'height: ' + (m.amount / maxAmount * 100) + '%'"></div>
      <span class="text-xs mt-1" x-text="m.label"></span>
    </div>
  </template>
</div>
```

---

## テスト用データの準備

テストしやすいよう、指示 1 の実行前に data/orders.json にサンプルデータを追加してください。
以下の内容で上書き（既存データが少ない場合）:

```json
[
  {
    "order_id": "ORD-20260308-001",
    "ordered_at": "2026-03-08T10:30:00.000Z",
    "items": [{"product_id": "prod001", "qty": 2}, {"product_id": "prod005", "qty": 1}],
    "product_amount_after_discount": 8250,
    "shipping_fee": 550,
    "fee_amount": 330,
    "payment_method": "cod",
    "customer": {"name": "田中 一郎", "name_kana": "タナカ イチロウ", "zip": "160-0022", "prefecture": "東京都", "city": "新宿区", "address1": "新宿3-1-1", "address2": "", "phone": "080-1111-2222", "email": "tanaka@example.com"},
    "delivery": {"date": "2026-03-12", "time_slot": "午前中"},
    "partner_id": "ptn0001",
    "partner_tracked_at": "2026-03-07T09:00:00.000Z",
    "achievement_status": "confirmed",
    "tracking_number": "1234-5678-0001",
    "shipped_at": "2026-03-09T14:00:00.000Z"
  },
  {
    "order_id": "ORD-20260308-002",
    "ordered_at": "2026-03-08T14:15:00.000Z",
    "items": [{"product_id": "prod003", "qty": 1}],
    "product_amount_after_discount": 8800,
    "shipping_fee": 550,
    "fee_amount": 0,
    "payment_method": "bank_transfer",
    "customer": {"name": "佐藤 美咲", "name_kana": "サトウ ミサキ", "zip": "150-0001", "prefecture": "東京都", "city": "渋谷区", "address1": "神宮前2-5-8", "address2": "メゾン神宮前 402", "phone": "090-3333-4444", "email": "sato@example.com"},
    "delivery": {"date": "2026-03-13", "time_slot": "14-16"},
    "partner_id": "ptn0001",
    "partner_tracked_at": "2026-03-08T12:00:00.000Z",
    "achievement_status": "pending",
    "tracking_number": null,
    "shipped_at": null
  },
  {
    "order_id": "ORD-20260309-001",
    "ordered_at": "2026-03-09T09:00:00.000Z",
    "items": [{"product_id": "prod004", "qty": 3}],
    "product_amount_after_discount": 13200,
    "shipping_fee": 0,
    "fee_amount": 330,
    "payment_method": "cod",
    "customer": {"name": "鈴木 大輔", "name_kana": "スズキ ダイスケ", "zip": "104-0061", "prefecture": "東京都", "city": "中央区", "address1": "銀座4-2-1", "address2": "", "phone": "070-5555-6666", "email": "suzuki@example.com"},
    "delivery": {"date": "2026-03-14", "time_slot": "16-18"},
    "partner_id": "ptn0002",
    "partner_tracked_at": "2026-03-08T20:00:00.000Z",
    "achievement_status": "pending",
    "tracking_number": null,
    "shipped_at": null
  },
  {
    "order_id": "ORD-20260309-002",
    "ordered_at": "2026-03-09T11:30:00.000Z",
    "items": [{"product_id": "prod002", "qty": 1}, {"product_id": "prod005", "qty": 2}],
    "product_amount_after_discount": 8800,
    "shipping_fee": 550,
    "fee_amount": 0,
    "payment_method": "bank_transfer",
    "customer": {"name": "高橋 花子", "name_kana": "タカハシ ハナコ", "zip": "530-0001", "prefecture": "大阪府", "city": "大阪市北区", "address1": "梅田1-3-1", "address2": "大阪ビル 10F", "phone": "06-1234-5678", "email": "takahashi@example.com"},
    "delivery": {"date": null, "time_slot": null},
    "partner_id": null,
    "partner_tracked_at": null,
    "achievement_status": "confirmed",
    "tracking_number": "9876-5432-1098",
    "shipped_at": "2026-03-10T10:00:00.000Z"
  },
  {
    "order_id": "ORD-20260310-001",
    "ordered_at": "2026-03-10T08:45:00.000Z",
    "items": [{"product_id": "prod001", "qty": 1}],
    "product_amount_after_discount": 3300,
    "shipping_fee": 550,
    "fee_amount": 0,
    "payment_method": "bank_transfer",
    "customer": {"name": "伊藤 健太", "name_kana": "イトウ ケンタ", "zip": "810-0001", "prefecture": "福岡県", "city": "福岡市中央区", "address1": "天神2-1-1", "address2": "", "phone": "092-111-2222", "email": "ito@example.com"},
    "delivery": {"date": "2026-03-15", "time_slot": "午前中"},
    "partner_id": "ptn0001",
    "partner_tracked_at": "2026-03-09T22:00:00.000Z",
    "achievement_status": "pending",
    "tracking_number": null,
    "shipped_at": null
  },
  {
    "order_id": "ORD-20260310-002",
    "ordered_at": "2026-03-10T13:20:00.000Z",
    "items": [{"product_id": "prod002", "qty": 1}],
    "product_amount_after_discount": 5500,
    "shipping_fee": 550,
    "fee_amount": 0,
    "payment_method": "bank_transfer",
    "customer": {"name": "渡辺 裕子", "name_kana": "ワタナベ ユウコ", "zip": "150-0001", "prefecture": "東京都", "city": "渋谷区", "address1": "銀座1-2-2", "address2": "ABCビル 301", "phone": "070-5564-4559", "email": "watanabe@example.com"},
    "delivery": {"date": "2026-03-16", "time_slot": "午前中"},
    "partner_id": "ptn0001",
    "partner_tracked_at": "2026-03-10T10:00:00.000Z",
    "achievement_status": "pending",
    "tracking_number": null,
    "shipped_at": null
  },
  {
    "order_id": "ORD-20260310-003",
    "ordered_at": "2026-03-10T16:00:00.000Z",
    "items": [{"product_id": "prod003", "qty": 1}, {"product_id": "prod004", "qty": 1}],
    "product_amount_after_discount": 13200,
    "shipping_fee": 0,
    "fee_amount": 330,
    "payment_method": "cod",
    "customer": {"name": "山本 真理", "name_kana": "ヤマモト マリ", "zip": "460-0008", "prefecture": "愛知県", "city": "名古屋市中区", "address1": "栄3-5-1", "address2": "", "phone": "052-333-4444", "email": "yamamoto@example.com"},
    "delivery": {"date": "2026-03-17", "time_slot": "18-20"},
    "partner_id": "ptn0002",
    "partner_tracked_at": "2026-03-10T14:00:00.000Z",
    "achievement_status": "cancelled",
    "tracking_number": null,
    "shipped_at": null
  }
]
```

これで pending 4件、confirmed 2件、cancelled 1件、パートナー ptn0001 が 4件、ptn0002 が 2件、直接注文 1件のテストデータになります。

---

## チェックリスト

- [ ] GET /api/order/list?status=pending でフィルターが動く
- [ ] GET /api/aggregate?month=2026-03 に by_partner が含まれる
- [ ] ordertool/index.html で注文一覧が表示される
- [ ] フィルター（ステータス・パートナー・月・検索）が動作する
- [ ] 出荷モーダルで送状番号入力 → confirmed に変わる
- [ ] キャンセル → cancelled に変わる
- [ ] detail.html で注文詳細が表示される
- [ ] aggregate.html でサマリー・パートナー別テーブル・月別グラフが表示される
- [ ] レスポンシブで崩れない（タブレット幅以上を想定）
