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
  }
};
