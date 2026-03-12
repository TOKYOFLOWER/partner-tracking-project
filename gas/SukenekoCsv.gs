// ============================================================
// メニュー
// ============================================================

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('TOKYOFLOWER')
    .addItem('初期セットアップ', 'setupSheets')
    .addSeparator()
    .addItem('助ネコCSV出力（未出力の注文）', 'exportSukenekoPending')
    .addItem('助ネコCSV出力（全注文）', 'exportSukeneko')
    .addToUi();
}

// ============================================================
// エクスポート関数
// ============================================================

function exportSukenekoPending() {
  _exportSukeneko(true);
}

function exportSukeneko() {
  _exportSukeneko(false);
}

// ============================================================
// 助ネコCSV出力メイン
// ============================================================

function _exportSukeneko(pendingOnly) {
  var orders = loadOrdersForApi();

  if (pendingOnly) {
    orders = orders.filter(function(o) { return o.achievement_status === 'pending'; });
  }

  if (orders.length === 0) {
    SpreadsheetApp.getUi().alert('対象の注文がありません。');
    return;
  }

  var products = sheetToArray('products');
  var productMap = {};
  products.forEach(function(p) { productMap[p.product_id] = p; });

  var headers = getSukenekoCsvHeader();
  var rows = [headers];

  orders.forEach(function(order) {
    var items = order.items || [];
    if (items.length === 0) return;

    var customer = order.customer || {};
    var delivery = order.delivery || {};
    var nameParts = splitName(customer.name || '');
    var kanaParts = splitName(customer.name_kana || '');
    var paymentStr = mapPaymentMethod(order.payment_method);
    var timeSlotStr = mapTimeSlot(delivery.time_slot);

    // 代引手数料
    var codFee = (order.payment_method === 'cod') ? (order.fee_amount || 0) : 0;
    // 決済手数料（代引以外）
    var settlementFee = (order.payment_method !== 'cod') ? (order.fee_amount || 0) : 0;

    // 請求金額合計（注文全体）
    var orderTotal = (order.product_amount_after_discount || 0)
                   + (order.shipping_fee || 0)
                   + (order.fee_amount || 0);

    // 郵便番号（数字のみ）
    var zipClean = (customer.zip || '').replace(/-/g, '');

    // お届け指定日 YYYY/MM/DD
    var deliveryDateStr = '';
    if (delivery.date) {
      if (delivery.date instanceof Date) {
        deliveryDateStr = Utilities.formatDate(delivery.date, 'Asia/Tokyo', 'yyyy/MM/dd');
      } else {
        deliveryDateStr = String(delivery.date).replace(/-/g, '/');
      }
    }

    // ordered_at の安全な日付フォーマット
    var orderedAtDate = '';
    var orderedAtTime = '';
    if (order.ordered_at) {
      var oaDate = (order.ordered_at instanceof Date) ? order.ordered_at : new Date(order.ordered_at);
      orderedAtDate = Utilities.formatDate(oaDate, 'Asia/Tokyo', 'yyyy/MM/dd');
      orderedAtTime = Utilities.formatDate(oaDate, 'Asia/Tokyo', 'HH:mm:ss');
    }

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var prod = productMap[item.product_id] || {};

      // 物理配置順 87列
      var row = new Array(87).fill('');

      // --- No.1-24 ---
      row[0]  = 'JS';                                                                        // No.1  受注ルート
      row[1]  = order.order_id;                                                               // No.2  受注番号
      row[2]  = orderedAtDate;                                                                    // No.3  注文日
      row[3]  = orderedAtTime;                                                                    // No.4  注文時間
      row[4]  = nameParts[0];                                                                 // No.5  注文者名（姓）
      row[5]  = nameParts[1];                                                                 // No.6  注文者名（名）
      row[6]  = kanaParts[0];                                                                 // No.7  注文者名（セイ）
      row[7]  = kanaParts[1];                                                                 // No.8  注文者名（メイ）
      row[8]  = customer.email || '';                                                         // No.9  注文者メールアドレス
      row[9]  = zipClean;                                                                     // No.10 注文者郵便番号
      row[10] = customer.prefecture || '';                                                    // No.11 注文者住所（都道府県）
      row[11] = customer.city || '';                                                          // No.12 注文者住所（市区町村）
      row[12] = customer.address1 || '';                                                      // No.13 注文者住所（市区町村以降）
      row[13] = customer.address2 || '';                                                      // No.14 注文者住所（建物名等）
      row[14] = '';                                                                           // No.15 注文者会社名
      row[15] = '';                                                                           // No.16 注文者部署名
      row[16] = customer.phone || '';                                                         // No.17 注文者電話番号
      row[17] = paymentStr;                                                                   // No.18 決済方法
      row[18] = settlementFee;                                                                // No.19 決済手数料
      row[19] = 0;                                                                            // No.20 利用ポイント数
      row[20] = 0;                                                                            // No.21 獲得ポイント数
      row[21] = '';                                                                           // No.22 備考（注文）
      row[22] = '';                                                                           // No.23 一言メモ（注文）
      row[23] = (i === 0) ? orderTotal : 0;                                                   // No.24 請求金額合計

      // --- No.77-82 ---
      row[24] = 0;                                                                            // No.77 利用ポイント内訳（税率10％）
      row[25] = 0;                                                                            // No.78 利用ポイント内訳（税率8％）
      row[26] = 0;                                                                            // No.79 利用ポイント内訳（税率0％）
      row[27] = (i === 0) ? orderTotal : 0;                                                   // No.80 請求金額内訳（税率10％）
      row[28] = 0;                                                                            // No.81 請求金額内訳（税率8％）
      row[29] = 0;                                                                            // No.82 請求金額内訳（税率0％）

      // --- No.25-36: お届け先（注文者と同じ） ---
      row[30] = nameParts[0];                                                                 // No.25 お届け先名（姓）
      row[31] = nameParts[1];                                                                 // No.26 お届け先名（名）
      row[32] = kanaParts[0];                                                                 // No.27 お届け先名（セイ）
      row[33] = kanaParts[1];                                                                 // No.28 お届け先名（メイ）
      row[34] = zipClean;                                                                     // No.29 お届け先郵便番号
      row[35] = customer.prefecture || '';                                                    // No.30 お届け先住所（都道府県）
      row[36] = customer.city || '';                                                          // No.31 お届け先住所（市区町村）
      row[37] = customer.address1 || '';                                                      // No.32 お届け先住所（市区町村以降）
      row[38] = customer.address2 || '';                                                      // No.33 お届け先住所（建物名等）
      row[39] = '';                                                                           // No.34 お届け先会社名
      row[40] = '';                                                                           // No.35 お届け先部署名
      row[41] = customer.phone || '';                                                         // No.36 お届け先電話番号

      // --- No.37: 備考（お届け先） ---
      row[42] = '';                                                                           // No.37 備考（お届け先）

      // --- No.38-49: 送り主（全て空欄） ---
      // row[43]-[54] は '' のまま                                                            // No.38-49

      // --- No.50-56 ---
      row[55] = '';                                                                           // No.50 一言メモ（お届け先）
      row[56] = 1;                                                                            // No.51 伝票No
      row[57] = '';                                                                           // No.52 運送会社システム
      row[58] = '';                                                                           // No.53 送り状種別
      row[59] = '';                                                                           // No.54 温度区分
      row[60] = deliveryDateStr;                                                              // No.55 お届け指定日
      row[61] = timeSlotStr;                                                                  // No.56 お届け時間帯

      // --- No.57-58 ---
      row[62] = (i === 0) ? (order.shipping_fee || 0) : 0;                                   // No.57 送料
      row[63] = (i === 0) ? codFee : 0;                                                      // No.58 代引手数料

      // --- No.59: 送り状記事欄 ---
      row[64] = '';                                                                           // No.59 送り状記事欄

      // --- No.60-62, 83: のし・ギフト（１） ---
      row[65] = '';                                                                           // No.60 のし・ギフト情報（１）種類
      row[66] = '';                                                                           // No.61 のし・ギフト情報（１）内容
      row[67] = 0;                                                                            // No.62 のし・ギフト情報（１）金額
      row[68] = '';                                                                           // No.83 のし・ギフト情報（１）税率

      // --- No.63-65, 84: のし・ギフト（２） ---
      row[69] = '';                                                                           // No.63 のし・ギフト情報（２）種類
      row[70] = '';                                                                           // No.64 のし・ギフト情報（２）内容
      row[71] = 0;                                                                            // No.65 のし・ギフト情報（２）金額
      row[72] = '';                                                                           // No.84 のし・ギフト情報（２）税率

      // --- No.66-68, 85: のし・ギフト（３） ---
      row[73] = '';                                                                           // No.66 のし・ギフト情報（３）種類
      row[74] = '';                                                                           // No.67 のし・ギフト情報（３）内容
      row[75] = 0;                                                                            // No.68 のし・ギフト情報（３）金額
      row[76] = '';                                                                           // No.85 のし・ギフト情報（３）税率

      // --- No.69-76: 商品明細 ---
      row[77] = '';                                                                           // No.69 一言メモ（伝票）
      row[78] = item.product_id || '';                                                        // No.70 商品コード
      row[79] = prod.name || '';                                                              // No.71 商品名
      row[80] = '';                                                                           // No.72 商品オプション情報（SKU）
      row[81] = item.qty || 1;                                                                // No.73 個数
      row[82] = Number(prod.price) || 0;                                                      // No.74 単価
      row[83] = '';                                                                           // No.75 消費税
      row[84] = 100;                                                                          // No.76 商品種別

      // --- No.86-87: 税 ---
      row[85] = 10;                                                                           // No.86 消費税率
      row[86] = '税込';                                                                       // No.87 消費税区分

      rows.push(row);
    }
  });

  // 一時シートに書き出し
  var ss = getSpreadsheet();
  var tempSheetName = '助ネコCSV_tmp';
  var tempSheet = ss.getSheetByName(tempSheetName);
  if (tempSheet) {
    tempSheet.clear();
  } else {
    tempSheet = ss.insertSheet(tempSheetName);
  }

  tempSheet.getRange(1, 1, rows.length, 87).setValues(rows);

  // ダウンロードURL生成
  var ssId = ss.getId();
  var sheetId = tempSheet.getSheetId();
  var csvUrl = 'https://docs.google.com/spreadsheets/d/' + ssId + '/gviz/tq?tqx=out:csv&gid=' + sheetId;

  var html = HtmlService.createHtmlOutput(
    '<html><body style="font-family:sans-serif;padding:20px;">' +
    '<h3>助ネコCSVダウンロード</h3>' +
    '<p>出力件数: ' + (rows.length - 1) + ' 明細行</p>' +
    '<p><a href="' + csvUrl + '" target="_blank" style="font-size:16px;">CSVをダウンロード</a></p>' +
    '<p style="color:#888;font-size:12px;">ダウンロード後、「助ネコCSV_tmp」シートは削除して構いません。</p>' +
    '</body></html>'
  )
  .setWidth(400)
  .setHeight(200);

  SpreadsheetApp.getUi().showModalDialog(html, '助ネコCSV出力');
}

// ============================================================
// 助ネコ87項目ヘッダー（物理配置順）
// 項目名は仕様書から正確にコピー。1文字でも変えないこと。
// ============================================================

function getSukenekoCsvHeader() {
  return [
    '受注ルート',                     // No.1
    '受注番号',                       // No.2
    '注文日',                         // No.3
    '注文時間',                       // No.4
    '注文者名（姓）',                 // No.5
    '注文者名（名）',                 // No.6
    '注文者名（セイ）',               // No.7
    '注文者名（メイ）',               // No.8
    '注文者メールアドレス',           // No.9
    '注文者郵便番号',                 // No.10
    '注文者住所（都道府県）',         // No.11
    '注文者住所（市区町村）',         // No.12
    '注文者住所（市区町村以降）',     // No.13
    '注文者住所（建物名等）',         // No.14
    '注文者会社名',                   // No.15
    '注文者部署名',                   // No.16
    '注文者電話番号',                 // No.17
    '決済方法',                       // No.18
    '決済手数料',                     // No.19
    '利用ポイント数',                 // No.20
    '獲得ポイント数',                 // No.21
    '備考（注文）',                   // No.22
    '一言メモ（注文）',               // No.23
    '請求金額合計',                   // No.24
    '利用ポイント内訳（税率10％）',   // No.77
    '利用ポイント内訳（税率8％）',    // No.78
    '利用ポイント内訳（税率0％）',    // No.79
    '請求金額内訳（税率10％）',       // No.80
    '請求金額内訳（税率8％）',        // No.81
    '請求金額内訳（税率0％）',        // No.82
    'お届け先名（姓）',               // No.25
    'お届け先名（名）',               // No.26
    'お届け先名（セイ）',             // No.27
    'お届け先名（メイ）',             // No.28
    'お届け先郵便番号',               // No.29
    'お届け先住所（都道府県）',       // No.30
    'お届け先住所（市区町村）',       // No.31
    'お届け先住所（市区町村以降）',   // No.32
    'お届け先住所（建物名等）',       // No.33
    'お届け先会社名',                 // No.34
    'お届け先部署名',                 // No.35
    'お届け先電話番号',               // No.36
    '備考（お届け先）',               // No.37
    '送り主名（姓）',                 // No.38
    '送り主名（名）',                 // No.39
    '送り主名（セイ）',               // No.40
    '送り主名（メイ）',               // No.41
    '送り主郵便番号',                 // No.42
    '送り主住所（都道府県）',         // No.43
    '送り主住所（市区町村）',         // No.44
    '送り主住所（市区町村以降）',     // No.45
    '送り主住所（建物名等）',         // No.46
    '送り主会社名',                   // No.47
    '送り主部署名',                   // No.48
    '送り主電話番号',                 // No.49
    '一言メモ（お届け先）',           // No.50
    '伝票No',                         // No.51
    '運送会社システム',               // No.52
    '送り状種別',                     // No.53
    '温度区分',                       // No.54
    'お届け指定日',                   // No.55
    'お届け時間帯',                   // No.56
    '送料',                           // No.57
    '代引手数料',                     // No.58
    '送り状記事欄',                   // No.59
    'のし・ギフト情報（１）種類',     // No.60
    'のし・ギフト情報（１）内容',     // No.61
    'のし・ギフト情報（１）金額',     // No.62
    'のし・ギフト情報（１）税率',     // No.83
    'のし・ギフト情報（２）種類',     // No.63
    'のし・ギフト情報（２）内容',     // No.64
    'のし・ギフト情報（２）金額',     // No.65
    'のし・ギフト情報（２）税率',     // No.84
    'のし・ギフト情報（３）種類',     // No.66
    'のし・ギフト情報（３）内容',     // No.67
    'のし・ギフト情報（３）金額',     // No.68
    'のし・ギフト情報（３）税率',     // No.85
    '一言メモ（伝票）',               // No.69
    '商品コード',                     // No.70
    '商品名',                         // No.71
    '商品オプション情報（SKU）',      // No.72
    '個数',                           // No.73
    '単価',                           // No.74
    '消費税',                         // No.75
    '商品種別',                       // No.76
    '消費税率',                       // No.86
    '消費税区分'                      // No.87
  ];
}

// ============================================================
// ヘルパー関数
// ============================================================

function splitName(fullName) {
  if (!fullName) return ['', ''];
  var parts = fullName.trim().split(/[\s　]+/);
  if (parts.length >= 2) {
    return [parts[0], parts.slice(1).join(' ')];
  }
  return [fullName, ''];
}

function mapPaymentMethod(method) {
  switch (method) {
    case 'cod': return '代金引換';
    case 'bank_transfer': return '銀行振込（前払い）';
    default: return method || '';
  }
}

function mapTimeSlot(slot) {
  if (!slot) return '';
  switch (slot) {
    case '午前中': return '午前中';
    case '12-14': return '12時～14時';
    case '14-16': return '14時～16時';
    case '16-18': return '16時～18時';
    case '18-20': return '18時～20時';
    case '19-21': return '19時～21時';
    case '20-21': return '20時～21時';
    default: return slot;
  }
}
