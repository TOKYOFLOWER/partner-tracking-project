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
    var settlementFee = 0; // 決済手数料(No.19)は0

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var prod = productMap[item.product_id] || {};

      var row = new Array(87).fill('');

      // No.1: 受注番号
      row[0] = order.order_id;
      // No.2: 受注日
      row[1] = order.ordered_at ? Utilities.formatDate(new Date(order.ordered_at), 'Asia/Tokyo', 'yyyy/MM/dd') : '';
      // No.3: 受注時間
      row[2] = order.ordered_at ? Utilities.formatDate(new Date(order.ordered_at), 'Asia/Tokyo', 'HH:mm:ss') : '';
      // No.4: 注文者名（姓）
      row[3] = nameParts[0];
      // No.5: 注文者名（名）
      row[4] = nameParts[1];
      // No.6: 注文者かな（姓）
      row[5] = kanaParts[0];
      // No.7: 注文者かな（名）
      row[6] = kanaParts[1];
      // No.8: 注文者郵便番号
      row[7] = customer.zip || '';
      // No.9: 注文者都道府県
      row[8] = customer.prefecture || '';
      // No.10: 注文者市区町村
      row[9] = customer.city || '';
      // No.11: 注文者住所1
      row[10] = customer.address1 || '';
      // No.12: 注文者住所2
      row[11] = customer.address2 || '';
      // No.13: 注文者電話番号
      row[12] = customer.phone || '';
      // No.14: 注文者メールアドレス
      row[13] = customer.email || '';
      // No.15: お届け先名（姓）— 注文者と同じ
      row[14] = nameParts[0];
      // No.16: お届け先名（名）
      row[15] = nameParts[1];
      // No.17: お届け先かな（姓）
      row[16] = kanaParts[0];
      // No.18: お届け先かな（名）
      row[17] = kanaParts[1];
      // No.19: 決済手数料
      row[18] = settlementFee;
      // No.20: お届け先郵便番号
      row[19] = customer.zip || '';
      // No.21: お届け先都道府県
      row[20] = customer.prefecture || '';
      // No.22: お届け先市区町村
      row[21] = customer.city || '';
      // No.23: お届け先住所1
      row[22] = customer.address1 || '';
      // No.24: お届け先住所2
      row[23] = customer.address2 || '';
      // No.25: お届け先電話番号
      row[24] = customer.phone || '';
      // No.26: 配達希望日
      row[25] = delivery.date || '';
      // No.27: 配達希望時間帯
      row[26] = timeSlotStr;
      // No.28: 支払方法
      row[27] = paymentStr;
      // No.29: 商品コード
      row[28] = item.product_id || '';
      // No.30: 商品名
      row[29] = prod.name || '';
      // No.31: 商品オプション
      row[30] = '';
      // No.32: 数量
      row[31] = item.qty || 1;
      // No.33: 単価
      row[32] = Number(prod.price) || 0;
      // No.34: 送料
      row[33] = (i === 0) ? (order.shipping_fee || 0) : 0;
      // No.35: 消費税区分
      row[34] = '税込';
      // No.36: 消費税率
      row[35] = 10;
      // No.37-57: 予備項目（空）
      // No.58: 代引手数料
      row[57] = (i === 0) ? codFee : 0;
      // No.59-87: 予備項目（空）

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
// 助ネコ87項目ヘッダー
// ============================================================

function getSukenekoCsvHeader() {
  return [
    '受注番号',          // 1
    '受注日',            // 2
    '受注時間',          // 3
    '注文者名（姓）',    // 4
    '注文者名（名）',    // 5
    '注文者かな（姓）',  // 6
    '注文者かな（名）',  // 7
    '注文者郵便番号',    // 8
    '注文者都道府県',    // 9
    '注文者市区町村',    // 10
    '注文者住所1',       // 11
    '注文者住所2',       // 12
    '注文者電話番号',    // 13
    '注文者メールアドレス', // 14
    'お届け先名（姓）',  // 15
    'お届け先名（名）',  // 16
    'お届け先かな（姓）', // 17
    'お届け先かな（名）', // 18
    '決済手数料',         // 19
    'お届け先郵便番号',   // 20
    'お届け先都道府県',   // 21
    'お届け先市区町村',   // 22
    'お届け先住所1',      // 23
    'お届け先住所2',      // 24
    'お届け先電話番号',   // 25
    '配達希望日',         // 26
    '配達希望時間帯',     // 27
    '支払方法',           // 28
    '商品コード',         // 29
    '商品名',             // 30
    '商品オプション',     // 31
    '数量',               // 32
    '単価',               // 33
    '送料',               // 34
    '消費税区分',         // 35
    '消費税率',           // 36
    '予備1',  // 37
    '予備2',  // 38
    '予備3',  // 39
    '予備4',  // 40
    '予備5',  // 41
    '予備6',  // 42
    '予備7',  // 43
    '予備8',  // 44
    '予備9',  // 45
    '予備10', // 46
    '予備11', // 47
    '予備12', // 48
    '予備13', // 49
    '予備14', // 50
    '予備15', // 51
    '予備16', // 52
    '予備17', // 53
    '予備18', // 54
    '予備19', // 55
    '予備20', // 56
    '予備21', // 57
    '代引手数料',  // 58
    '予備22', // 59
    '予備23', // 60
    '予備24', // 61
    '予備25', // 62
    '予備26', // 63
    '予備27', // 64
    '予備28', // 65
    '予備29', // 66
    '予備30', // 67
    '予備31', // 68
    '予備32', // 69
    '予備33', // 70
    '予備34', // 71
    '予備35', // 72
    '予備36', // 73
    '予備37', // 74
    '予備38', // 75
    '予備39', // 76
    '予備40', // 77
    '予備41', // 78
    '予備42', // 79
    '予備43', // 80
    '予備44', // 81
    '予備45', // 82
    '予備46', // 83
    '予備47', // 84
    '予備48', // 85
    '予備49', // 86
    '予備50'  // 87
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
