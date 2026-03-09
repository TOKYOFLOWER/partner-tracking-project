// API 通信ラッパー
const API = {
  async _fetch(path, options) {
    try {
      const res = await fetch(CONFIG.API_BASE + path, options);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'サーバーエラーが発生しました');
      }
      return data;
    } catch (err) {
      if (err instanceof TypeError) {
        throw new Error('サーバーに接続できません。ネットワークを確認してください。');
      }
      throw err;
    }
  },

  fetchProducts() {
    return this._fetch('/api/product/list');
  },

  fetchProduct(id) {
    return this._fetch('/api/product/' + encodeURIComponent(id));
  },

  validatePartner(id) {
    return this._fetch('/api/partner/validate?id=' + encodeURIComponent(id));
  },

  submitOrder(orderData) {
    return this._fetch('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
  }
};
