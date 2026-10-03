// Hardcoded parameters from proxy-builder
const HARDCODED_CONFIG = {
  FP: "unsafe",
  CS: "TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_ECDSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_ECDSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA:TLS_ECDHE_ECDSA_WITH_AES_128_CBC_SHA256:TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256",
  FM: JSON.stringify({"tcp": [{"type": "fragment", "settings": {"packets": "tlshello", "lengths": ["0", "104", "1"], "delays": ["0"], "maxSplit": "0"}},{"type": "fragment", "settings": {"packets": "1-1", "lengths": ["114", "1"], "delays": ["1"], "maxSplit": "11"}}]}
)
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Subscription processor: /sub?target=...
    if (url.pathname === "/sub") {
      const targetSub = url.searchParams.get("target");
      if (!targetSub) {
        return new Response("Missing target subscription URL", { status: 400 });
      }

      try {
        const upstreamResp = await fetch(targetSub, {
          headers: {
            "User-Agent": request.headers.get("User-Agent") || "v2rayNG/1.8.12"
          }
        });

        if (!upstreamResp.ok) {
          return new Response(`Upstream fetch failed: ${upstreamResp.statusText}`, { status: upstreamResp.status });
        }

        const rawContent = await upstreamResp.text();
        const decodedContent = tryDecodeBase64(rawContent.trim());
        const lines = decodedContent.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith("#"));

        const enhancedLines = lines.map(line => enhanceProxyUrl(line));
        const subPayload = enhancedLines.join("\n");
        const encodedOutput = btoa(unescape(encodeURIComponent(subPayload)));

        return new Response(encodedOutput, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "Subscription-Userinfo": upstreamResp.headers.get("Subscription-Userinfo") || "upload=0; download=0; total=107374182400; expire=0"
          }
        });
      } catch (err) {
        return new Response(`Worker processing error: ${err.message}`, { status: 500 });
      }
    }

    // Web UI
    return new Response(renderHtml(), {
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }
};

function tryDecodeBase64(str) {
  try {
    const cleaned = str.replace(/-/g, "+").replace(/_/g, "/");
    return decodeURIComponent(escape(atob(cleaned)));
  } catch (e) {
    return str;
  }
}

function enhanceProxyUrl(proxyUrl) {
  try {
    const parsed = new URL(proxyUrl);
    const protocol = parsed.protocol.replace(":", "").toLowerCase();

    if (protocol !== "vless" && protocol !== "trojan") {
      return proxyUrl;
    }

    const params = parsed.searchParams;
    const security = (params.get("security") || "").toLowerCase();

    params.set("fp", HARDCODED_CONFIG.FP);

    if (security === "tls" || security === "reality") {
      params.set("cs", HARDCODED_CONFIG.CS);
      params.set("fm", HARDCODED_CONFIG.FM);
    }

    return parsed.toString();
  } catch (err) {
    return proxyUrl;
  }
}

function renderHtml() {
  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ارتقادهنده هوشمند سابسکریپشن | FFSub</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090d16;
      --card-bg: rgba(18, 24, 38, 0.75);
      --card-border: rgba(255, 255, 255, 0.08);
      --primary: #38bdf8;
      --primary-hover: #0ea5e9;
      --accent: #818cf8;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --success: #34d399;
      --code-bg: rgba(15, 23, 42, 0.85);
      --badge-bg: rgba(56, 189, 248, 0.12);
      --badge-border: rgba(56, 189, 248, 0.25);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Vazirmatn', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    body {
      background: radial-gradient(circle at 50% 0%, #1e1b4b 0%, var(--bg) 60%);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 2.5rem 1rem;
      line-height: 1.6;
    }

    .wrapper {
      width: 100%;
      max-width: 680px;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .header {
      text-align: center;
      margin-bottom: 0.5rem;
    }

    .badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: var(--badge-bg);
      border: 1px solid var(--badge-border);
      color: var(--primary);
      padding: 0.35rem 0.9rem;
      border-radius: 9999px;
      font-size: 0.78rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }

    .badge-dot {
      width: 7px;
      height: 7px;
      background: var(--primary);
      border-radius: 50%;
      box-shadow: 0 0 10px var(--primary);
    }

    h1 {
      font-size: 1.85rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, #ffffff 30%, #93c5fd 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 0.5rem;
    }

    .subtitle {
      font-size: 0.95rem;
      color: var(--text-muted);
      max-width: 520px;
      margin: 0 auto;
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-radius: 20px;
      padding: 1.75rem;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5);
    }

    label {
      font-size: 0.88rem;
      font-weight: 600;
      color: #e2e8f0;
      display: block;
      margin-bottom: 0.6rem;
    }

    .input-wrapper {
      position: relative;
      margin-bottom: 1rem;
    }

    input[type="text"] {
      width: 100%;
      background: var(--code-bg);
      border: 1.5px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      color: #fff;
      padding: 0.9rem 1.1rem;
      font-size: 0.92rem;
      outline: none;
      transition: all 0.2s ease;
      direction: ltr;
      text-align: left;
    }

    input[type="text"]:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
    }

    .btn-main {
      width: 100%;
      background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
      color: #0b1120;
      border: none;
      border-radius: 12px;
      padding: 0.95rem;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.25s ease;
      box-shadow: 0 4px 20px rgba(56, 189, 248, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .btn-main:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 24px rgba(56, 189, 248, 0.35);
      filter: brightness(1.05);
    }

    .btn-main:active {
      transform: translateY(0);
    }

    .result-section {
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px dashed rgba(255, 255, 255, 0.1);
      display: none;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .result-box {
      display: flex;
      gap: 0.6rem;
    }

    .copy-btn {
      padding: 0 1.5rem;
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.9rem;
      white-space: nowrap;
      transition: all 0.2s ease;
    }

    .copy-btn:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.25);
    }

    .copy-btn.copied {
      background: var(--success);
      color: #064e3b;
      border-color: var(--success);
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    @media (max-width: 600px) {
      .info-grid {
        grid-template-columns: 1fr;
      }
    }

    .info-card {
      background: rgba(15, 23, 42, 0.55);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 16px;
      padding: 1.25rem;
    }

    .info-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.95rem;
      font-weight: 700;
      color: #f8fafc;
      margin-bottom: 0.6rem;
    }

    .info-title svg {
      width: 20px;
      height: 20px;
      stroke: var(--primary);
    }

    .info-desc {
      font-size: 0.83rem;
      color: var(--text-muted);
      line-height: 1.65;
    }

    .feature-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      margin-top: 0.5rem;
    }

    .feature-item {
      display: flex;
      align-items: flex-start;
      gap: 0.45rem;
      font-size: 0.82rem;
      color: #cbd5e1;
    }

    .feature-item::before {
      content: "✔";
      color: var(--success);
      font-weight: bold;
      font-size: 0.75rem;
      margin-top: 0.15rem;
    }

    .footer {
      text-align: center;
      font-size: 0.85rem;
      color: #94a3b8;
      margin-top: 0.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.6rem;
    }

    .developer-links {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      flex-wrap: wrap;
      justify-content: center;
    }

    .dev-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      color: #cbd5e1;
      text-decoration: none;
      font-size: 0.8rem;
      font-weight: 500;
      transition: all 0.2s ease;
    }

    .dev-badge:hover {
      background: rgba(56, 189, 248, 0.12);
      border-color: rgba(56, 189, 248, 0.35);
      color: #38bdf8;
      transform: translateY(-1px);
    }

    .dev-badge svg {
      width: 15px;
      height: 15px;
      fill: currentColor;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <header class="header">
      <div class="badge-pill">
        <span class="badge-dot"></span>
        <span>سرویس لبه ابری (Cloudflare Workers)</span>
      </div>
      <h1>مبدل و تقویت‌کننده سابسکریپشن</h1>
      <p class="subtitle">تزریق خودکار فرگمنت TLS و بهینه‌سازی الگوریتم‌های رمزنگاری جهت افزایش پایداری و دورزدن محدودیت‌ها</p>
    </header>

    <main class="card">
      <label for="subInput">لینک اشتراک فعلی (Subscription URL):</label>
      <div class="input-wrapper">
        <input type="text" id="subInput" placeholder="https://example.com/api/v1/client/subscribe?token=..." autocomplete="off" spellcheck="false" />
      </div>

      <button class="btn-main" onclick="generateLink()">
        <span>تبدیل و ساخت لینک بهینه‌شده</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m13 2-2 10h7l-7 10 2-10H6Z"/></svg>
      </button>

      <div class="result-section" id="resultSection">
        <label for="resInput">لینک سابسکریپشن اختصاصی و ارتقایافته شما:</label>
        <div class="result-box">
          <input type="text" id="resInput" readonly />
          <button class="copy-btn" id="copyBtn" onclick="copyResult()">کپی لینک</button>
        </div>
        <p style="font-size: 0.8rem; color: #94a3b8; margin-top: 0.6rem;">این لینک را مستقیماً درون کلاینت‌های V2rayNG, Streisand, v2rayN, Sing-box یا سایر کلاینت‌ها وارد کنید.</p>
      </div>
    </main>

    <section class="info-grid">
      <div class="info-card">
        <div class="info-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          چرا استفاده از آن امن است؟
        </div>
        <p class="info-desc">
          این سرویس به صورت <strong>کاملاً بدون حالت (Stateless)</strong> روی شبکه کلودفلر اجرا می‌شود:
        </p>
        <ul class="feature-list">
          <li class="feature-item">هیچ لینکی، توکنی یا لاگی در دیتابیس ذخیره نمی‌شود.</li>
          <li class="feature-item">کانکشن شما به طور مستقیم از طریق سرور اصلی خودتان است و ترافیک از ورکر رد نمی‌شود (فقط لیست کانفیگ‌ها خوانده می‌شود).</li>
          <li class="feature-item">تمام ارتباطات تحت رمزنگاری سرتاسری HTTPS ایمن است.</li>
        </ul>
      </div>

      <div class="info-card">
        <div class="info-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          دقیقاً چه کاری انجام می‌دهد؟
        </div>
        <p class="info-desc">
          ورکر هنگام درخواست کلاینت شما، تنظیمات پیشرفته شبکه را به کانفیگ‌ها تزریق می‌کند:
        </p>
        <ul class="feature-list">
          <li class="feature-item"><strong>تکه کردن بسته‌ها (TLS Fragment):</strong> خرد کردن پکت‌های هلو (Client Hello) جهت عبور از سیستم فیلترینگ DPI.</li>
          <li class="feature-item"><strong>سایفرسوئیت‌های بهینه (CS):</strong> تنظیم بهترین مجموعه‌های رمزنگاری TLS مدرن و امن.</li>
          <li class="feature-item"><strong>فینگرپرینت (FP):</strong> یکپارچه‌سازی اثرانگشت TLS کلاینت‌ها برای هماهنگی بیشتر.</li>
        </ul>
      </div>
    </section>

    <footer class="footer">
      <div class="developer-links">
        <span style="color: #64748b; font-size: 0.82rem;">توسعه‌دهنده:</span>
        <a class="dev-badge" href="https://github.com/mehdichamani/" target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
          <span>مهدی چمنی (mehdichamani)</span>
        </a>
        <a class="dev-badge" href="https://ajbv.ir/" target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
          <span>وب‌سایت شخصی (ajbv.ir)</span>
        </a>
      </div>
      <div>FFSub • ارائه‌شده روی زیرساخت Cloudflare Edge</div>
    </footer>
  </div>

  <script>
    function generateLink() {
      const input = document.getElementById('subInput').value.trim();
      if (!input) return;

      const finalUrl = window.location.origin + '/sub?target=' + encodeURIComponent(input);
      document.getElementById('resInput').value = finalUrl;
      document.getElementById('resultSection').style.display = 'block';
    }

    function copyResult() {
      const res = document.getElementById('resInput');
      if (!res.value) return;
      res.select();
      navigator.clipboard.writeText(res.value);
      const btn = document.getElementById('copyBtn');
      btn.innerText = 'کپی شد!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.innerText = 'کپی لینک';
        btn.classList.remove('copied');
      }, 1800);
    }
  </script>
</body>
</html>`;
}