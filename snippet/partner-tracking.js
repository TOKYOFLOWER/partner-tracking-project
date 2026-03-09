/**
 * Partner Tracking Snippet
 * 商品ページや LP に設置して ?id=ptn0001 を検知し、Cookie に保存する
 *
 * 使い方: <script src="/snippet/partner-tracking.js"></script>
 * または外部URL: <script src="https://your-server/snippet/partner-tracking.js"></script>
 */
(function () {
  var COOKIE_DAYS = 30;
  var API_BASE = window.PARTNER_TRACKING_API || "";
  var PARAM_NAME = "id";

  function getQueryParam(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  function setCookie(name, value, days) {
    var expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = name + "=" + encodeURIComponent(value) + "; expires=" + expires + "; path=/; SameSite=Lax";
  }

  function getCookie(name) {
    var match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return match ? decodeURIComponent(match[1]) : null;
  }

  var partnerId = getQueryParam(PARAM_NAME);
  if (!partnerId) return;

  // 形式チェック
  if (!/^ptn\d{4,}$/.test(partnerId)) return;

  // サーバーに有効性を問い合わせ
  var xhr = new XMLHttpRequest();
  xhr.open("GET", API_BASE + "/api/partner/validate?id=" + encodeURIComponent(partnerId), true);
  xhr.onload = function () {
    if (xhr.status === 200) {
      try {
        var data = JSON.parse(xhr.responseText);
        if (data.valid) {
          setCookie("partner_id", data.partner_id, COOKIE_DAYS);
          setCookie("partner_tracked_at", new Date().toISOString(), COOKIE_DAYS);
        }
      } catch (e) {
        // ignore parse errors
      }
    }
  };
  xhr.send();
})();
