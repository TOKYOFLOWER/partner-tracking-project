# データモデル案

## パートナーマスタ
| column | type | required | note |
|---|---|---:|---|
| partner_id | string | yes | 例: ptn0001 |
| partner_name | string | yes | 表示名 |
| status | string | yes | active / inactive |
| commission_plan | string | no | 初期は tiered 想定 |
| created_at | datetime | no | 登録日時 |
| memo | text | no | 備考 |

## 注文
| column | type | required | note |
|---|---|---:|---|
| order_id | string | yes | 注文番号 |
| ordered_at | datetime | yes | 注文日時 |
| total_amount | number | yes | 注文金額 |
| product_amount_after_discount | number | yes | 値引き後商品代 |
| shipping_fee | number | no | 送料 |
| fee_amount | number | no | 手数料 |
| partner_id | string | no | 紹介元ID |
| partner_tracked_at | datetime | no | 紹介元セット日時 |
| achievement_status | string | yes | pending / confirmed / cancelled |
| tracking_number | string | no | 宅配送状番号 |
| shipped_at | datetime | no | 出荷完了日時 |

## 集計定義
- 確定売上: `achievement_status = confirmed` の `product_amount_after_discount` 合計
- 確定件数: `achievement_status = confirmed` の件数
- 未確定件数: `achievement_status = pending` の件数
- キャンセル件数: `achievement_status = cancelled` の件数
