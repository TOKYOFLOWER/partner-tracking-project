# 要件定義書 ver.0.2

## 1. 確定事項
- パートナーID形式: `ptn0001`
- URL形式: `?id=ptn0001`
- 紹介元保持: 30日
- 保存方法: Cookie
- 無効ID: マスタ未登録または inactive は無効
- 成果確定: 出荷完了時
- 出荷完了判定: 宅配の送状番号を入力した時点
- キャンセル: 成果なし
- 集計対象金額: 値引き後商品代合計（送料・手数料除外）
- ダッシュボード初期項目:
  - 今月の確定売上
  - 今月の確定件数
  - 今月の未確定件数
  - 今月のキャンセル件数
  - パートナー別確定売上
  - パートナー別確定件数
  - 月別推移

## 2. パートナーマスタ
最低限必要な項目:
- partner_id
- partner_name
- status
- commission_plan
- created_at
- memo

初期運用はスプレッドシート管理を推奨。

## 3. 注文データに追加する項目
最低限:
- partner_id
- partner_tracked_at
- achievement_status
- tracking_number
- shipped_at

将来追加候補:
- commission_rate
- commission_amount
- partner_name_snapshot
- attribution_source

## 4. achievement_status
- pending: 注文済み・未出荷
- confirmed: 出荷完了
- cancelled: キャンセル

## 5. 無効IDの扱い
- partner_master に存在しない ID は無効
- status != active の ID は無効
- 無効 ID は Cookie に保存しない
- 無効 ID では注文に紐付けない

## 6. Phase 設計
### Phase 1
- パートナーマスタ作成
- `?id=` の取得
- Cookie 保存（30日）
- 注文保存時に partner_id を保存
- 送状番号入力で confirmed 更新
- 集計データ出力

### Phase 2
- GitHub 管理のダッシュボード UI
- パートナー別集計表示
- 月別推移表示

### Phase 3
- 段階報酬率（10% / 15% / 20%）
- パートナー別ログイン
- 月次支払管理
- QR コード機能
- パートナー向け閲覧画面
