# Claude Code 実行指示

このプロジェクトを途中で止めず、Phase1が動くところまで一気に実装してください。

## 前提
- 既存カートはないので、新規で最小構成を作る
- Node.js + Express で進める
- データ保存は最初は JSON でよい
- 不明点は合理的に仮定して進め、最後に一覧で報告する
- 確認の質問で止まらない

## 必須要件
- ?id=ptn0001 形式で partner_id を受け取る
- 有効な partner_id のみ採用
- partner_id を 30日 Cookie 保存
- 注文作成時に partner_id と partner_tracked_at を保存
- achievement_status は pending / confirmed / cancelled
- 送状番号入力時に shipped_at を記録し confirmed にする
- キャンセル時は cancelled にする
- 集計対象金額は値引き後商品代合計（送料・手数料除外）
- 集計 API を作る
- ローカル起動できる状態にする
- README に起動手順と確認手順を書く

## 最後に必ず報告
1. 実装概要
2. 作成ファイル一覧
3. API一覧
4. 起動方法
5. 確認手順
6. 仮定した事項
