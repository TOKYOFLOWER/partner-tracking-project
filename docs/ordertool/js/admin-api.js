// 管理画面用 API 通信ラッパー（GASバックエンド用）
const AdminAPI = {
  async _get(params) {
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(ADMIN_CONFIG.API_BASE + '?' + qs);
      const data = await res.json();
      if (data.error) {
        return { error: data.error };
      }
      return data;
    } catch (err) {
      if (err instanceof TypeError) {
        return { error: 'サーバーに接続できません。ネットワークを確認してください。' };
      }
      return { error: err.message };
    }
  },

  async _post(body) {
    try {
      const res = await fetch(ADMIN_CONFIG.API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.error) {
        return { error: data.error };
      }
      return data;
    } catch (err) {
      if (err instanceof TypeError) {
        return { error: 'サーバーに接続できません。ネットワークを確認してください。' };
      }
      return { error: err.message };
    }
  },

  // 注文一覧（フィルター付き）
  fetchOrders(filters = {}) {
    const params = { action: 'order_list' };
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        params[key] = value;
      }
    }
    return this._get(params);
  },

  // 注文詳細
  fetchOrder(orderId) {
    return this._get({ action: 'order_detail', order_id: orderId });
  },

  // 出荷処理
  shipOrder(orderId, trackingNumber) {
    return this._post({
      action: 'order_ship',
      order_id: orderId,
      tracking_number: trackingNumber
    });
  },

  // キャンセル
  cancelOrder(orderId) {
    return this._post({
      action: 'order_cancel',
      order_id: orderId
    });
  },

  // 集計（月別）
  fetchAggregate(month) {
    const params = { action: 'aggregate' };
    if (month) params.month = month;
    return this._get(params);
  },

  // 月別推移
  fetchMonthly() {
    return this._get({ action: 'aggregate_monthly' });
  },

  // パートナー一覧
  fetchPartners() {
    return this._get({ action: 'partner_list' });
  },

  // パートナー詳細
  fetchPartnerDetail(id) {
    return this._get({ action: 'partner_detail', id: id });
  },

  // パートナーステータス更新
  updatePartnerStatus(partnerId, status) {
    return this._post({ action: 'partner_update_status', partner_id: partnerId, status: status });
  },

  // パートナー特別加算料率更新
  updatePartnerBonus(partnerId, bonusRate, memo) {
    return this._post({
      action: 'partner_update_bonus',
      partner_id: partnerId,
      bonus_rate: bonusRate,
      bonus_rate_memo: memo
    });
  },

  // 商品一覧（全件・管理用）
  fetchAllProducts() {
    return this._get({ action: 'product_list_all' });
  },

  // 商品カテゴリ一覧
  fetchCategories() {
    return this._get({ action: 'product_categories' });
  },

  // 商品作成
  createProduct(data) {
    return this._post({ action: 'product_create', ...data });
  },

  // 商品更新
  updateProduct(data) {
    return this._post({ action: 'product_update', ...data });
  },

  // 商品削除
  deleteProduct(productId) {
    return this._post({ action: 'product_delete', product_id: productId });
  },

  // 在庫切替
  toggleProductStock(productId, inStock) {
    return this._post({ action: 'product_toggle_stock', product_id: productId, in_stock: inStock });
  },

  // バリエーション一覧
  fetchVariants(productId) {
    return this._get({ action: 'variant_list', product_id: productId });
  },

  // バリエーション作成
  createVariant(data) {
    return this._post({ action: 'variant_create', ...data });
  },

  // バリエーション更新
  updateVariant(data) {
    return this._post({ action: 'variant_update', ...data });
  },

  // バリエーション削除
  deleteVariant(variantId) {
    return this._post({ action: 'variant_delete', variant_id: variantId });
  }
};
