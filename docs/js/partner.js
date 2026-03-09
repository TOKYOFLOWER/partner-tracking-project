// パートナー追跡の localStorage 管理
const PARTNER_STORAGE_KEY = 'partner_info';

const Partner = {
  // URL の ?id=xxx を検出 → API で検証 → 有効なら localStorage に保存
  async initPartnerTracking() {
    const params = new URLSearchParams(window.location.search);
    const partnerId = params.get('id');
    if (!partnerId) return;

    // 既に有効なパートナー情報がある場合は上書きしない（最初の紹介者を優先）
    const existing = this.getPartnerInfo();
    if (existing) return;

    try {
      const result = await API.validatePartner(partnerId);
      if (result.valid) {
        const now = new Date();
        const expires = new Date(now.getTime() + CONFIG.PARTNER_COOKIE_DAYS * 24 * 60 * 60 * 1000);
        const info = {
          partner_id: partnerId,
          tracked_at: now.toISOString(),
          expires_at: expires.toISOString()
        };
        localStorage.setItem(PARTNER_STORAGE_KEY, JSON.stringify(info));
      }
    } catch (e) {
      // パートナー検証失敗は静かに無視（ユーザー体験に影響させない）
      console.warn('Partner validation failed:', e.message);
    }
  },

  // localStorage から取得。期限切れなら null
  getPartnerInfo() {
    const raw = localStorage.getItem(PARTNER_STORAGE_KEY);
    if (!raw) return null;
    try {
      const info = JSON.parse(raw);
      if (new Date(info.expires_at) < new Date()) {
        this.clearPartnerInfo();
        return null;
      }
      return info;
    } catch (e) {
      this.clearPartnerInfo();
      return null;
    }
  },

  clearPartnerInfo() {
    localStorage.removeItem(PARTNER_STORAGE_KEY);
  }
};
