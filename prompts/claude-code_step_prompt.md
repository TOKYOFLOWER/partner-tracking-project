# Claude Code 用ステップ実装プロンプト

## 今回は Phase 1 だけ実装してください

### やること
- `?id=` パラメータの取得
- partner_master に存在する active な ID のみ有効化
- Cookie に 30 日保存
- 注文保存時に `partner_id` と `partner_tracked_at` を記録
- 送状番号入力時に `achievement_status = confirmed` を更新
- キャンセル時に `achievement_status = cancelled` を更新

### 前提仕様
- partner_id 形式: `ptn0001`
- 成果確定は出荷完了時
- 出荷完了は送状番号入力時
- 集計対象は confirmed のみ
- 集計金額は値引き後商品代合計（送料・手数料除外）

### 出力してほしいこと
1. 既存コードで触るべきファイル候補
2. 実装手順
3. 追加すべきカラムや項目
4. 実装コード
5. テスト観点
