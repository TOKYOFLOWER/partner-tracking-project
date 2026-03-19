// API 通信ラッパー（GASバックエンド用）
const API = {
  async _get(params) {
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(CONFIG.API_BASE + '?' + qs);
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }
      return data;
    } catch (err) {
      if (err instanceof TypeError) {
        throw new Error('サーバーに接続できません。ネットワークを確認してください。');
      }
      throw err;
    }
  },

  async _post(body) {
    try {
      const res = await fetch(CONFIG.API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
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
    return this._get({ action: 'product_list' });
  },

  fetchProduct(id) {
    return this._get({ action: 'product_detail', product_id: id });
  },

  validatePartner(id) {
    return this._get({ action: 'partner_validate', id: id });
  },

  fetchVariants(productId) {
    return this._get({ action: 'variant_list', product_id: productId });
  },

  submitOrder(orderData) {
    return this._post({ action: 'order_create', ...orderData });
  }
};
