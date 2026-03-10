// 管理画面用 API 通信ラッパー
const AdminAPI = {
  async _fetch(path, options) {
    try {
      const res = await fetch(ADMIN_CONFIG.API_BASE + path, options);
      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || 'サーバーエラーが発生しました', status: res.status };
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
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, value);
      }
    }
    const qs = params.toString();
    return this._fetch('/api/order/list' + (qs ? '?' + qs : ''));
  },

  // 注文詳細
  fetchOrder(orderId) {
    return this._fetch('/api/order/' + encodeURIComponent(orderId));
  },

  // 出荷処理
  shipOrder(orderId, trackingNumber) {
    return this._fetch('/api/order/' + encodeURIComponent(orderId) + '/ship', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tracking_number: trackingNumber })
    });
  },

  // キャンセル
  cancelOrder(orderId) {
    return this._fetch('/api/order/' + encodeURIComponent(orderId) + '/cancel', {
      method: 'PATCH'
    });
  },

  // 集計（月別）
  fetchAggregate(month) {
    const qs = month ? '?month=' + encodeURIComponent(month) : '';
    return this._fetch('/api/aggregate' + qs);
  },

  // 月別推移
  fetchMonthly() {
    return this._fetch('/api/aggregate/monthly');
  },

  // パートナー一覧
  fetchPartners() {
    return this._fetch('/api/partner/list');
  }
};
