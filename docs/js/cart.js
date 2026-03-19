// カート操作モジュール
const CART_STORAGE_KEY = 'cart';

const Cart = {
  getCart() {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return { items: [], updated_at: null };
    try {
      return JSON.parse(raw);
    } catch (e) {
      return { items: [], updated_at: null };
    }
  },

  _saveCart(cart) {
    cart.updated_at = new Date().toISOString();
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  },

  addToCart(productId, qty, variantInfo) {
    qty = qty || 1;
    const cart = this.getCart();
    var key = variantInfo ? variantInfo.sku : productId;
    const existing = cart.items.find(function(item) { return (item.sku || item.product_id) === key; });
    if (existing) {
      existing.qty += qty;
    } else {
      var item = { product_id: productId, qty: qty };
      if (variantInfo) {
        item.sku = variantInfo.sku;
        item.selections = variantInfo.selections;
        item.variant_price = variantInfo.price;
      }
      cart.items.push(item);
    }
    this._saveCart(cart);
  },

  updateQty(productId, qty) {
    const cart = this.getCart();
    if (qty <= 0) {
      cart.items = cart.items.filter(function(item) { return item.product_id !== productId; });
    } else {
      const existing = cart.items.find(function(item) { return item.product_id === productId; });
      if (existing) {
        existing.qty = qty;
      }
    }
    this._saveCart(cart);
  },

  removeFromCart(productId) {
    const cart = this.getCart();
    cart.items = cart.items.filter(function(item) { return item.product_id !== productId; });
    this._saveCart(cart);
  },

  clearCart() {
    localStorage.removeItem(CART_STORAGE_KEY);
  },

  getCartCount() {
    const cart = this.getCart();
    return cart.items.reduce(function(sum, item) { return sum + item.qty; }, 0);
  },

  // 商品マスタを参照して小計・送料・合計を計算
  calculateTotals(products) {
    const cart = this.getCart();
    let subtotal = 0;
    const details = [];

    cart.items.forEach(function(item) {
      const product = products.find(function(p) { return p.product_id === item.product_id; });
      if (product) {
        const lineTotal = product.price * item.qty;
        subtotal += lineTotal;
        details.push({
          product_id: item.product_id,
          name: product.name,
          price: product.price,
          qty: item.qty,
          lineTotal: lineTotal,
          image: product.image
        });
      }
    });

    const shippingFee = subtotal >= CONFIG.FREE_SHIPPING_THRESHOLD ? 0 : CONFIG.SHIPPING_FEE;

    return {
      items: details,
      subtotal: subtotal,
      shippingFee: shippingFee,
      total: subtotal + shippingFee
    };
  }
};
