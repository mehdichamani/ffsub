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
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sub Enhancer</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 1.5rem; }
    .container { width: 100%; max-width: 480px; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 2rem; }
    h1 { font-size: 1.2rem; margin-bottom: 0.25rem; font-weight: 600; }
    p { font-size: 0.85rem; color: #94a3b8; margin-bottom: 1.5rem; }
    label { font-size: 0.8rem; font-weight: 600; color: #94a3b8; display: block; margin-bottom: 0.4rem; }
    input[type="text"] { width: 100%; background: #0b1120; border: 1px solid #334155; border-radius: 8px; color: #f8fafc; padding: 0.75rem 1rem; font-size: 0.9rem; margin-bottom: 1.25rem; outline: none; }
    input[type="text"]:focus { border-color: #0ea5e9; }
    button.btn-main { width: 100%; background: #0ea5e9; color: #fff; border: none; border-radius: 8px; padding: 0.8rem; font-size: 0.95rem; font-weight: 600; cursor: pointer; }
    button.btn-main:hover { opacity: 0.9; }
    .result-section { margin-top: 1.5rem; display: none; }
    .result-box { display: flex; gap: 0.5rem; }
    .result-box input { margin-bottom: 0; }
    .copy-btn { padding: 0 1.25rem; background: #334155; color: #fff; border: none; border-radius: 8px; cursor: pointer; white-space: nowrap; }
    .copy-btn:hover { background: #475569; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Sub Enhancer</h1>
    <p>Injects fixed proxy-builder TLS fragment and cipher parameters.</p>

    <label for="subInput">Main Subscription Link</label>
    <input type="text" id="subInput" placeholder="https://domain.com/sub/token" />

    <button class="btn-main" onclick="generateLink()">✨ Enhance</button>

    <div class="result-section" id="resultSection">
      <label for="resInput">Enhanced Link</label>
      <div class="result-box">
        <input type="text" id="resInput" readonly />
        <button class="copy-btn" onclick="copyResult()">Copy</button>
      </div>
    </div>
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
      res.select();
      navigator.clipboard.writeText(res.value);
      const btn = event.target;
      btn.innerText = 'Copied!';
      setTimeout(() => btn.innerText = 'Copy', 1500);
    }
  </script>
</body>
</html>`;
}