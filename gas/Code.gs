// ============================================================
// ユーティリティ
// ============================================================

function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function nowJST() {
  return new Date();  // GASのタイムゾーンはappsscript.jsonでAsia/Tokyoに設定済み
}

function nowJSTString() {
  return Utilities.formatDate(new Date(), 'Asia/Tokyo', "yyyy-MM-dd'T'HH:mm:ss'+09:00'");
}

function formatJST(date) {
  if (!date) return null;
  var d = (date instanceof Date) ? date : new Date(date);
  if (isNaN(d.getTime())) return null;
  return Utilities.formatDate(d, 'Asia/Tokyo', "yyyy-MM-dd'T'HH:mm:ss'+09:00'");
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function sheetToArray(sheetName) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) return [];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j];
    }
    result.push(row);
  }
  return result;
}

// ============================================================
// orders シートのフラットカラムを API レスポンス用ネスト構造に変換
// ============================================================

function orderRowToApiFormat(row) {
  return {
    order_id: row.order_id || '',
    ordered_at: formatJST(row.ordered_at),
    items: row.items ? (typeof row.items === 'string' ? JSON.parse(row.items) : row.items) : [],
    item_names: row.item_names || '',
    item_qty: row.item_qty || 0,
    product_amount_after_discount: Number(row.product_amount_after_discount) || 0,
    shipping_fee: Number(row.shipping_fee) || 0,
    fee_amount: Number(row.fee_amount) || 0,
    payment_method: row.payment_method || null,
    orderer: row.orderer_name ? {
      name: String(row.orderer_name || ''),
      name_kana: String(row.orderer_name_kana || ''),
      zip: String(row.orderer_zip || ''),
      prefecture: String(row.orderer_prefecture || ''),
      city: String(row.orderer_city || ''),
      address1: String(row.orderer_address1 || ''),
      address2: String(row.orderer_address2 || ''),
      phone: String(row.orderer_phone || ''),
      email: String(row.orderer_email || '')
    } : null,
    customer: {
      name: String(row.customer_name || ''),
      name_kana: String(row.customer_name_kana || ''),
      zip: String(row.customer_zip || ''),
      prefecture: String(row.customer_prefecture || ''),
      city: String(row.customer_city || ''),
      address1: String(row.customer_address1 || ''),
      address2: String(row.customer_address2 || ''),
      phone: String(row.customer_phone || ''),
      email: String(row.customer_email || '')
    },
    delivery: {
      date: row.delivery_date || null,
      time_slot: row.delivery_time_slot || null
    },
    partner_id: row.partner_id || null,
    partner_tracked_at: formatJST(row.partner_tracked_at),
    achievement_status: row.achievement_status || 'pending',
    tracking_number: row.tracking_number || null,
    shipped_at: formatJST(row.shipped_at)
  };
}

// ============================================================
// 注文データ読み込み
// ============================================================

function loadOrdersForApi() {
  var rows = sheetToArray('orders');
  return rows.map(orderRowToApiFormat);
}

// ============================================================
// doGet — action パラメータで分岐
// ============================================================

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';

  try {
    switch (action) {
      case 'product_list':
        return handleProductList();
      case 'product_detail':
        return handleProductDetail(e.parameter.product_id);
      case 'partner_validate':
        return handlePartnerValidate(e.parameter.id);
      case 'partner_list':
        return handlePartnerList();
      case 'partner_detail':
        return handlePartnerDetail(e.parameter.id);
      case 'order_list':
        return handleOrderList(e.parameter);
      case 'order_detail':
        return handleOrderDetail(e.parameter.order_id);
      case 'aggregate':
        return handleAggregate(e.parameter.month);
      case 'aggregate_monthly':
        return handleAggregateMonthly();
      default:
        return jsonResponse({ error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ============================================================
// doPost — action パラメータで分岐
// ============================================================

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action || '';

    switch (action) {
      case 'order_create':
        return handleOrderCreate(body);
      case 'order_ship':
        return handleOrderShip(body);
      case 'order_cancel':
        return handleOrderCancel(body);
      case 'partner_register':
        return handlePartnerRegister(body);
      case 'partner_update_status':
        return handlePartnerUpdateStatus(body);
      case 'partner_login':
        return handlePartnerLogin(body);
      case 'partner_mypage':
        return handlePartnerMypage(body);
      default:
        return jsonResponse({ error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ============================================================
// 商品
// ============================================================

function handleProductList() {
  var products = sheetToArray('products');
  var inStock = products.filter(function(p) {
    var v = p.in_stock;
    return v === true || v === 'TRUE' || v === 'true' || v === 1 || v === '1';
  });
  inStock.sort(function(a, b) { return (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0); });
  return jsonResponse(inStock);
}

function handleProductDetail(productId) {
  if (!productId) return jsonResponse({ error: 'product_id is required' });
  var products = sheetToArray('products');
  var p = products.find(function(x) { return x.product_id === productId; });
  if (!p) return jsonResponse({ error: 'product not found' });
  return jsonResponse(p);
}

// ============================================================
// パートナー
// ============================================================

function handlePartnerValidate(partnerId) {
  if (!partnerId) return jsonResponse({ valid: false, reason: 'id is required' });
  if (!/^ptn\d{4,}$/.test(partnerId)) {
    return jsonResponse({ valid: false, reason: 'invalid format' });
  }
  var partners = sheetToArray('partners');
  var p = partners.find(function(x) { return x.partner_id === partnerId; });
  if (!p) return jsonResponse({ valid: false, reason: 'not found' });
  if (p.status !== 'active') return jsonResponse({ valid: false, reason: 'inactive' });
  return jsonResponse({ valid: true, partner_id: p.partner_id, partner_name: p.partner_name });
}

function handlePartnerList() {
  var partners = sheetToArray('partners');
  return jsonResponse(partners);
}

function handlePartnerDetail(partnerId) {
  if (!partnerId) return jsonResponse({ error: 'id is required' });
  var partners = sheetToArray('partners');
  var p = partners.find(function(x) { return x.partner_id === partnerId; });
  if (!p) return jsonResponse({ error: 'partner not found' });
  return jsonResponse(p);
}

// ============================================================
// パートナー登録・ステータス更新
// ============================================================

function handlePartnerRegister(body) {
  // 必須チェック
  var required = ['name', 'name_kana', 'zip', 'prefecture', 'city', 'address1', 'phone', 'email',
                   'bank_name', 'bank_branch', 'bank_account_type', 'bank_account_number', 'bank_account_holder'];
  for (var i = 0; i < required.length; i++) {
    if (!body[required[i]] || !String(body[required[i]]).trim()) {
      return jsonResponse({ error: '必須項目が入力されていません: ' + required[i] });
    }
  }

  // メール重複チェック
  var partners = sheetToArray('partners');
  var dup = partners.find(function(p) { return p.email === body.email; });
  if (dup) {
    return jsonResponse({ error: 'このメールアドレスは既に登録されています' });
  }

  // partner_id 自動採番
  var maxNum = 0;
  partners.forEach(function(p) {
    var m = String(p.partner_id).match(/^ptn(\d+)$/);
    if (m) {
      var n = parseInt(m[1], 10);
      if (n > maxNum) maxNum = n;
    }
  });
  var partnerId = 'ptn' + String(maxNum + 1).padStart(4, '0');

  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('partners');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var newRow = headers.map(function(h) {
    switch (h) {
      case 'partner_id': return partnerId;
      case 'status': return 'pending';
      case 'created_at': return nowJSTString();
      case 'partner_name': return body.name || '';
      case 'partner_name_kana': return body.name_kana || '';
      case 'company_name': return body.company_name || '';
      case 'zip': return body.zip || '';
      case 'prefecture': return body.prefecture || '';
      case 'city': return body.city || '';
      case 'address1': return body.address1 || '';
      case 'address2': return body.address2 || '';
      case 'phone': return body.phone || '';
      case 'email': return body.email || '';
      case 'bank_name': return body.bank_name || '';
      case 'bank_branch': return body.bank_branch || '';
      case 'bank_account_type': return body.bank_account_type || '';
      case 'bank_account_number': return body.bank_account_number || '';
      case 'bank_account_holder': return body.bank_account_holder || '';
      case 'commission_plan': return 'standard';
      case 'memo': return '';
      default: return '';
    }
  });

  sheet.appendRow(newRow);
  return jsonResponse({ success: true, partner_id: partnerId, message: '申請を受け付けました' });
}

function handlePartnerUpdateStatus(body) {
  var partnerId = body.partner_id;
  var newStatus = body.status;
  if (!partnerId) return jsonResponse({ error: 'partner_id is required' });
  if (!newStatus || ['pending', 'active', 'inactive'].indexOf(newStatus) < 0) {
    return jsonResponse({ error: 'invalid status' });
  }

  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('partners');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf('partner_id');
  var statusCol = headers.indexOf('status');

  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] === partnerId) {
      sheet.getRange(i + 1, statusCol + 1).setValue(newStatus);
      var partners = sheetToArray('partners');
      var p = partners.find(function(x) { return x.partner_id === partnerId; });
      return jsonResponse(p);
    }
  }
  return jsonResponse({ error: 'partner not found' });
}

// ============================================================
// 注文作成
// ============================================================

function handleOrderCreate(body) {
  var items = body.items;
  var products = sheetToArray('products');

  // items 金額検証
  var calculatedTotal = 0;
  var itemNames = [];
  var itemQty = 0;
  if (items && items.length > 0) {
    for (var i = 0; i < items.length; i++) {
      var prod = products.find(function(p) { return p.product_id === items[i].product_id; });
      if (!prod) throw new Error('商品が見つかりません: ' + items[i].product_id);
      calculatedTotal += Number(prod.price) * items[i].qty;
      itemNames.push(prod.name);
      itemQty += items[i].qty;
    }
  }

  var resolvedAmount = body.product_amount_after_discount;
  if (resolvedAmount === undefined || resolvedAmount === null) {
    resolvedAmount = calculatedTotal;
  } else if (calculatedTotal !== Number(resolvedAmount)) {
    return jsonResponse({ error: '金額が一致しません', expected: calculatedTotal, received: resolvedAmount });
  }

  // 送料計算
  var shippingFee = resolvedAmount >= 10000 ? 0 : 550;

  // 代引き手数料
  var feeAmount = body.fee_amount || 0;
  if (body.payment_method === 'cod') {
    feeAmount = feeAmount || 330;
  }

  // パートナー検証
  var partnerId = body.partner_id || null;
  var partnerTrackedAt = body.partner_tracked_at || null;
  if (partnerId) {
    var partners = sheetToArray('partners');
    var partner = partners.find(function(p) { return p.partner_id === partnerId && p.status === 'active'; });
    if (!partner) {
      partnerId = null;
      partnerTrackedAt = null;
    }
  }

  // ORD-YYYYMMDD-NNN 自動採番 (JST)
  var now = new Date();
  var dateStr = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyyMMdd');
  var prefix = 'ORD-' + dateStr + '-';

  var ss = getSpreadsheet();
  var orderSheet = ss.getSheetByName('orders');
  var existingOrders = sheetToArray('orders');
  var todayOrders = existingOrders.filter(function(o) { return o.order_id && String(o.order_id).startsWith(prefix); });
  var nextNum = todayOrders.length + 1;
  var orderId = prefix + String(nextNum).padStart(3, '0');

  // orderer / customer
  var ord = body.orderer || {};
  var c = body.customer || {};
  var d = body.delivery || {};

  // orders シートにフラットカラムで書き込み
  var headers = orderSheet.getRange(1, 1, 1, orderSheet.getLastColumn()).getValues()[0];
  var newRow = headers.map(function(h) {
    switch (h) {
      case 'order_id': return orderId;
      case 'ordered_at': return nowJSTString();
      case 'items': return JSON.stringify(items || []);
      case 'item_names': return itemNames.join(', ');
      case 'item_qty': return itemQty;
      case 'product_amount_after_discount': return resolvedAmount;
      case 'shipping_fee': return shippingFee;
      case 'fee_amount': return feeAmount;
      case 'payment_method': return body.payment_method || '';
      case 'customer_name': return c.name || '';
      case 'customer_name_kana': return c.name_kana || '';
      case 'customer_zip': return c.zip || '';
      case 'customer_prefecture': return c.prefecture || '';
      case 'customer_city': return c.city || '';
      case 'customer_address1': return c.address1 || '';
      case 'customer_address2': return c.address2 || '';
      case 'customer_phone': return c.phone || '';
      case 'customer_email': return c.email || '';
      case 'orderer_name': return ord.name || '';
      case 'orderer_name_kana': return ord.name_kana || '';
      case 'orderer_zip': return ord.zip || '';
      case 'orderer_prefecture': return ord.prefecture || '';
      case 'orderer_city': return ord.city || '';
      case 'orderer_address1': return ord.address1 || '';
      case 'orderer_address2': return ord.address2 || '';
      case 'orderer_phone': return ord.phone || '';
      case 'orderer_email': return ord.email || '';
      case 'delivery_date': return d.date || '';
      case 'delivery_time_slot': return d.time_slot || '';
      case 'partner_id': return partnerId || '';
      case 'partner_tracked_at': return partnerTrackedAt || '';
      case 'achievement_status': return 'pending';
      case 'tracking_number': return '';
      case 'shipped_at': return '';
      default: return '';
    }
  });

  orderSheet.appendRow(newRow);

  var total = resolvedAmount + shippingFee + feeAmount;
  return jsonResponse({ success: true, order_id: orderId, total: total });
}

// ============================================================
// 注文一覧・詳細
// ============================================================

function handleOrderList(params) {
  var orders = loadOrdersForApi();
  var status = params.status || '';
  var partnerId = params.partner_id || '';
  var month = params.month || '';
  var search = params.search || '';

  if (status) {
    orders = orders.filter(function(o) { return o.achievement_status === status; });
  }
  if (partnerId) {
    orders = orders.filter(function(o) { return o.partner_id === partnerId; });
  }
  if (month) {
    var parts = month.split('-');
    var y = parseInt(parts[0]);
    var m = parseInt(parts[1]) - 1;
    orders = orders.filter(function(o) {
      var dt = new Date(o.ordered_at);
      return dt.getFullYear() === y && dt.getMonth() === m;
    });
  }
  if (search) {
    var q = search.toLowerCase();
    orders = orders.filter(function(o) {
      var matchId = o.order_id && o.order_id.toLowerCase().indexOf(q) >= 0;
      var matchName = o.customer && o.customer.name && o.customer.name.toLowerCase().indexOf(q) >= 0;
      return matchId || matchName;
    });
  }

  var summary = {
    total: orders.length,
    pending: orders.filter(function(o) { return o.achievement_status === 'pending'; }).length,
    confirmed: orders.filter(function(o) { return o.achievement_status === 'confirmed'; }).length,
    cancelled: orders.filter(function(o) { return o.achievement_status === 'cancelled'; }).length
  };

  return jsonResponse({ orders: orders, summary: summary });
}

function handleOrderDetail(orderId) {
  if (!orderId) return jsonResponse({ error: 'order_id is required' });
  var orders = loadOrdersForApi();
  var order = orders.find(function(o) { return o.order_id === orderId; });
  if (!order) return jsonResponse({ error: 'order not found' });
  return jsonResponse(order);
}

// ============================================================
// 出荷・キャンセル
// ============================================================

function handleOrderShip(body) {
  var orderId = body.order_id;
  var trackingNumber = body.tracking_number;
  if (!orderId) return jsonResponse({ error: 'order_id is required' });
  if (!trackingNumber) return jsonResponse({ error: 'tracking_number is required' });

  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('orders');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf('order_id');
  var statusCol = headers.indexOf('achievement_status');
  var trackCol = headers.indexOf('tracking_number');
  var shippedCol = headers.indexOf('shipped_at');

  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] === orderId) {
      sheet.getRange(i + 1, statusCol + 1).setValue('confirmed');
      sheet.getRange(i + 1, trackCol + 1).setValue(trackingNumber);
      sheet.getRange(i + 1, shippedCol + 1).setValue(nowJSTString());
      var orders = loadOrdersForApi();
      var order = orders.find(function(o) { return o.order_id === orderId; });
      return jsonResponse(order);
    }
  }
  return jsonResponse({ error: 'order not found' });
}

function handleOrderCancel(body) {
  var orderId = body.order_id;
  if (!orderId) return jsonResponse({ error: 'order_id is required' });

  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('orders');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf('order_id');
  var statusCol = headers.indexOf('achievement_status');

  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] === orderId) {
      sheet.getRange(i + 1, statusCol + 1).setValue('cancelled');
      var orders = loadOrdersForApi();
      var order = orders.find(function(o) { return o.order_id === orderId; });
      return jsonResponse(order);
    }
  }
  return jsonResponse({ error: 'order not found' });
}

// ============================================================
// 集計
// ============================================================

function handleAggregate(targetMonth) {
  var now = nowJST();
  var year, month;
  if (targetMonth) {
    var parts = targetMonth.split('-');
    year = parseInt(parts[0]);
    month = parseInt(parts[1]) - 1;
  } else {
    year = now.getFullYear();
    month = now.getMonth();
  }

  var orders = loadOrdersForApi();
  var allMonthlyOrders = orders.filter(function(o) {
    var dt = new Date(o.ordered_at);
    return dt.getFullYear() === year && dt.getMonth() === month;
  });

  var partnerOrders = allMonthlyOrders.filter(function(o) { return o.partner_id; });

  function calcAmount(o) {
    return (o.product_amount_after_discount || 0) + (o.shipping_fee || 0) + (o.fee_amount || 0);
  }

  var confirmed = allMonthlyOrders.filter(function(o) { return o.achievement_status === 'confirmed'; });
  var pending = allMonthlyOrders.filter(function(o) { return o.achievement_status === 'pending'; });
  var cancelled = allMonthlyOrders.filter(function(o) { return o.achievement_status === 'cancelled'; });

  // パートナー名マップ
  var partners = sheetToArray('partners');
  var partnerNameMap = {};
  partners.forEach(function(p) { partnerNameMap[p.partner_id] = p.partner_name; });

  // パートナー別集計
  var byPartnerMap = {};
  allMonthlyOrders.forEach(function(o) {
    var key = o.partner_id || '__direct__';
    if (!byPartnerMap[key]) {
      byPartnerMap[key] = {
        partner_id: o.partner_id || null,
        partner_name: o.partner_id ? (partnerNameMap[o.partner_id] || o.partner_id) : '直接注文',
        total_count: 0,
        confirmed: { count: 0, amount: 0 },
        pending: { count: 0, amount: 0 },
        cancelled: { count: 0, amount: 0 }
      };
    }
    var entry = byPartnerMap[key];
    entry.total_count += 1;
    var amount = calcAmount(o);
    if (o.achievement_status === 'confirmed') {
      entry.confirmed.count += 1;
      entry.confirmed.amount += amount;
    } else if (o.achievement_status === 'pending') {
      entry.pending.count += 1;
      entry.pending.amount += amount;
    } else if (o.achievement_status === 'cancelled') {
      entry.cancelled.count += 1;
      entry.cancelled.amount += amount;
    }
  });

  function sumAmount(arr) {
    return arr.reduce(function(s, o) { return s + calcAmount(o); }, 0);
  }

  var monthStr = year + '-' + String(month + 1).padStart(2, '0');
  return jsonResponse({
    month: monthStr,
    total_orders: allMonthlyOrders.length,
    partner_orders: partnerOrders.length,
    confirmed: { count: confirmed.length, amount: sumAmount(confirmed) },
    pending: { count: pending.length, amount: sumAmount(pending) },
    cancelled: { count: cancelled.length, amount: sumAmount(cancelled) },
    by_partner: Object.values(byPartnerMap)
  });
}

function handleAggregateMonthly() {
  var orders = loadOrdersForApi();
  var monthlyMap = {};

  orders.forEach(function(o) {
    if (!o.partner_id) return;
    var dt = new Date(o.ordered_at);
    var key = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');

    if (!monthlyMap[key]) {
      monthlyMap[key] = { month: key, confirmed_sales: 0, confirmed_count: 0, pending_count: 0, cancelled_count: 0 };
    }

    if (o.achievement_status === 'confirmed') {
      monthlyMap[key].confirmed_sales += o.product_amount_after_discount;
      monthlyMap[key].confirmed_count += 1;
    } else if (o.achievement_status === 'pending') {
      monthlyMap[key].pending_count += 1;
    } else if (o.achievement_status === 'cancelled') {
      monthlyMap[key].cancelled_count += 1;
    }
  });

  var result = Object.values(monthlyMap).sort(function(a, b) { return a.month.localeCompare(b.month); });
  return jsonResponse(result);
}

// ============================================================
// パートナーログイン・マイページ
// ============================================================

function handlePartnerLogin(body) {
  var partnerId = body.partner_id;
  var email = body.email;
  if (!partnerId || !email) {
    return jsonResponse({ error: 'パートナーIDとメールアドレスを入力してください' });
  }

  var partners = sheetToArray('partners');
  var p = partners.find(function(x) {
    return x.partner_id === partnerId && x.email === email;
  });

  if (!p) {
    return jsonResponse({ error: 'パートナーIDまたはメールアドレスが正しくありません' });
  }

  if (p.status !== 'active') {
    var statusMsg = {
      'pending': 'アカウントは現在申請審査中です。承認後にログインできます。',
      'inactive': 'アカウントは現在無効になっています。お問い合わせください。'
    };
    return jsonResponse({ error: statusMsg[p.status] || 'アカウントが無効です' });
  }

  return jsonResponse({
    success: true,
    partner: {
      partner_id: p.partner_id,
      partner_name: p.partner_name,
      partner_name_kana: p.partner_name_kana,
      email: p.email,
      status: p.status,
      created_at: formatJST(p.created_at)
    }
  });
}

function handlePartnerMypage(body) {
  var partnerId = body.partner_id;
  var email = body.email;
  if (!partnerId || !email) {
    return jsonResponse({ error: '認証情報がありません' });
  }

  // 認証チェック
  var partners = sheetToArray('partners');
  var p = partners.find(function(x) {
    return x.partner_id === partnerId && x.email === email && x.status === 'active';
  });
  if (!p) {
    return jsonResponse({ error: '認証に失敗しました。再ログインしてください。' });
  }

  var orders = loadOrdersForApi();
  var myOrders = orders.filter(function(o) { return o.partner_id === partnerId; });

  // 現在月
  var now = nowJST();
  var thisYear = now.getFullYear();
  var thisMonth = now.getMonth(); // 0-indexed

  // 直近3ヶ月の計算（当月含む）
  var months3 = [];
  for (var i = 0; i < 3; i++) {
    var d = new Date(thisYear, thisMonth - i, 1);
    months3.push({ year: d.getFullYear(), month: d.getMonth() });
  }

  // 月別集計
  var monthlyStats = [];
  for (var m = 0; m < months3.length; m++) {
    var my = months3[m].year;
    var mm = months3[m].month;
    var monthOrders = myOrders.filter(function(o) {
      var dt = new Date(o.ordered_at);
      return dt.getFullYear() === my && dt.getMonth() === mm;
    });
    var confirmed = monthOrders.filter(function(o) { return o.achievement_status === 'confirmed'; });
    var pending = monthOrders.filter(function(o) { return o.achievement_status === 'pending'; });
    var cancelled = monthOrders.filter(function(o) { return o.achievement_status === 'cancelled'; });

    var confirmedSales = confirmed.reduce(function(s, o) { return s + (o.product_amount_after_discount || 0); }, 0);
    var pendingSales = pending.reduce(function(s, o) { return s + (o.product_amount_after_discount || 0); }, 0);

    monthlyStats.push({
      month: my + '-' + String(mm + 1).padStart(2, '0'),
      confirmed_count: confirmed.length,
      confirmed_sales: confirmedSales,
      pending_count: pending.length,
      pending_sales: pendingSales,
      cancelled_count: cancelled.length,
      total_count: monthOrders.length
    });
  }

  // 直近3ヶ月の確定件数・確定売上合計（ランク計算用）
  var total3mConfirmedCount = 0;
  var total3mConfirmedSales = 0;
  for (var j = 0; j < monthlyStats.length; j++) {
    total3mConfirmedCount += monthlyStats[j].confirmed_count;
    total3mConfirmedSales += monthlyStats[j].confirmed_sales;
  }

  // ランク判定
  var rankInfo = calcPartnerRank(total3mConfirmedCount, total3mConfirmedSales);

  // 当月の報酬見込み
  var thisMonthStats = monthlyStats[0]; // 最新月
  var estimatedCommission = Math.floor(thisMonthStats.confirmed_sales * rankInfo.rate);

  // 直近注文一覧（最新20件）
  myOrders.sort(function(a, b) {
    return new Date(b.ordered_at) - new Date(a.ordered_at);
  });
  var recentOrders = myOrders.slice(0, 20).map(function(o) {
    return {
      order_id: o.order_id,
      ordered_at: o.ordered_at,
      item_names: o.item_names,
      product_amount_after_discount: o.product_amount_after_discount,
      achievement_status: o.achievement_status
    };
  });

  return jsonResponse({
    partner: {
      partner_id: p.partner_id,
      partner_name: p.partner_name,
      status: p.status,
      created_at: formatJST(p.created_at)
    },
    rank: rankInfo,
    this_month: {
      month: thisMonthStats.month,
      confirmed_count: thisMonthStats.confirmed_count,
      confirmed_sales: thisMonthStats.confirmed_sales,
      pending_count: thisMonthStats.pending_count,
      pending_sales: thisMonthStats.pending_sales,
      estimated_commission: estimatedCommission
    },
    rolling_3m: {
      confirmed_count: total3mConfirmedCount,
      confirmed_sales: total3mConfirmedSales,
      monthly: monthlyStats
    },
    recent_orders: recentOrders,
    total_orders: myOrders.length,
    total_confirmed_sales: myOrders
      .filter(function(o) { return o.achievement_status === 'confirmed'; })
      .reduce(function(s, o) { return s + (o.product_amount_after_discount || 0); }, 0)
  });
}

function calcPartnerRank(count3m, sales3m) {
  // ランク定義（上位から判定）
  var ranks = [
    { name: 'プラチナ', rate: 0.15, emoji: '💎',
      achieve_count: 30, achieve_sales: 300000,
      keep_count: 20, keep_sales: 200000 },
    { name: 'ゴールド', rate: 0.12, emoji: '🥇',
      achieve_count: 15, achieve_sales: 100000,
      keep_count: 10, keep_sales: 70000 },
    { name: 'シルバー', rate: 0.08, emoji: '🥈',
      achieve_count: 5, achieve_sales: 30000,
      keep_count: 3, keep_sales: 20000 },
    { name: 'レギュラー', rate: 0.05, emoji: '🌱',
      achieve_count: 0, achieve_sales: 0,
      keep_count: 0, keep_sales: 0 }
  ];

  var currentRank = ranks[3]; // デフォルトはレギュラー
  for (var i = 0; i < ranks.length; i++) {
    var r = ranks[i];
    if (count3m >= r.achieve_count || sales3m >= r.achieve_sales) {
      currentRank = r;
      break;
    }
  }

  // 次のランクへの進捗
  var nextRank = null;
  for (var k = 0; k < ranks.length; k++) {
    if (ranks[k].name === currentRank.name && k > 0) {
      nextRank = ranks[k - 1];
      break;
    }
  }

  var progress = null;
  if (nextRank) {
    progress = {
      next_rank: nextRank.name,
      next_emoji: nextRank.emoji,
      next_rate: nextRank.rate,
      count_needed: nextRank.achieve_count,
      count_current: count3m,
      count_progress: Math.min(100, Math.round((count3m / nextRank.achieve_count) * 100)),
      sales_needed: nextRank.achieve_sales,
      sales_current: sales3m,
      sales_progress: Math.min(100, Math.round((sales3m / nextRank.achieve_sales) * 100))
    };
  }

  return {
    name: currentRank.name,
    emoji: currentRank.emoji,
    rate: currentRank.rate,
    rate_percent: currentRank.rate * 100,
    progress: progress
  };
}

// ============================================================
// 初期セットアップ — シート作成
// ============================================================

function setupSheets() {
  var ss = getSpreadsheet();

  // products シート
  if (!ss.getSheetByName('products')) {
    var ps = ss.insertSheet('products');
    ps.appendRow([
      'product_id', 'name', 'description', 'price', 'tax_included',
      'image', 'category', 'in_stock', 'sort_order'
    ]);
  }

  // partners シート
  if (!ss.getSheetByName('partners')) {
    var pts = ss.insertSheet('partners');
    pts.appendRow([
      'partner_id', 'status', 'created_at',
      'partner_name', 'partner_name_kana', 'company_name',
      'zip', 'prefecture', 'city', 'address1', 'address2',
      'phone', 'email',
      'bank_name', 'bank_branch', 'bank_account_type', 'bank_account_number', 'bank_account_holder',
      'commission_plan', 'memo'
    ]);
  }

  // orders シート（フラットカラム版）
  if (!ss.getSheetByName('orders')) {
    var os = ss.insertSheet('orders');
    var headers = [
      'order_id', 'ordered_at', 'items', 'item_names', 'item_qty',
      'product_amount_after_discount', 'shipping_fee', 'fee_amount',
      'payment_method',
      'customer_name', 'customer_name_kana', 'customer_zip',
      'customer_prefecture', 'customer_city', 'customer_address1',
      'customer_address2', 'customer_phone', 'customer_email',
      'orderer_name', 'orderer_name_kana', 'orderer_zip', 'orderer_prefecture',
      'orderer_city', 'orderer_address1', 'orderer_address2',
      'orderer_phone', 'orderer_email',
      'delivery_date', 'delivery_time_slot',
      'partner_id', 'partner_tracked_at',
      'achievement_status', 'tracking_number', 'shipped_at'
    ];
    os.appendRow(headers);
    // items JSON列(C列)を非表示
    os.hideColumns(3);
  }

  SpreadsheetApp.getUi().alert('セットアップが完了しました。\n※既存データがあるシートは再作成されません。カラム変更が必要な場合はシートを手動で削除してから再実行してください。');
}
