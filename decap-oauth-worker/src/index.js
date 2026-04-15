const DEFAULT_GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const DEFAULT_GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const TOKEN_POST_MESSAGE_PREFIX = "authorization:github:success:";
const ERROR_POST_MESSAGE_PREFIX = "authorization:github:error:";
const MAX_STATE_AGE_MS = 10 * 60 * 1000;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const json = (body, init = {}) =>
  new Response(JSON.stringify(body, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(init.headers || {})
    },
    ...init
  });

const html = (markup, init = {}) =>
  new Response(markup, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      ...(init.headers || {})
    },
    ...init
  });

const bytesToBase64 = (bytes) => {
  let binary = "";
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary);
};

const base64ToBytes = (value) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
const base64UrlEncode = (value) => bytesToBase64(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
const base64UrlDecode = (value) => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return base64ToBytes(padded);
};

const parseAllowedOrigins = (env) =>
  String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const resolveOriginFromRequest = (request) => {
  const explicitOrigin = request.headers.get("Origin");
  if (explicitOrigin) return explicitOrigin;
  const referer = request.headers.get("Referer");
  if (!referer) return "";
  try {
    return new URL(referer).origin;
  } catch (error) {
    return "";
  }
};

const normalizeOrigin = (value = "") => {
  try {
    return new URL(value).origin;
  } catch (error) {
    return "";
  }
};

const isOriginAllowed = (origin, env) => {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return false;
  const allowList = parseAllowedOrigins(env);
  if (!allowList.length) return true;
  return allowList.some((candidate) => normalizeOrigin(candidate) === normalizedOrigin);
};

const importHmacKey = async (secret) =>
  crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );

const signStatePayload = async (payloadText, secret) => {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(payloadText));
  return base64UrlEncode(new Uint8Array(signature));
};

const createSignedState = async (origin, env) => {
  const payload = {
    nonce: crypto.randomUUID(),
    origin: normalizeOrigin(origin),
    issuedAt: Date.now()
  };
  const payloadText = JSON.stringify(payload);
  const signature = await signStatePayload(payloadText, env.STATE_SECRET);
  return `${base64UrlEncode(textEncoder.encode(payloadText))}.${signature}`;
};

const verifySignedState = async (state, env) => {
  if (!state || !String(state).includes(".")) throw new Error("缺少有效的 state");
  const [encodedPayload, signature] = String(state).split(".", 2);
  const payloadText = textDecoder.decode(base64UrlDecode(encodedPayload));
  const expectedSignature = await signStatePayload(payloadText, env.STATE_SECRET);
  if (expectedSignature !== signature) throw new Error("OAuth state 校验失败");

  const payload = JSON.parse(payloadText);
  if (!payload.origin || !payload.issuedAt) throw new Error("OAuth state 不完整");
  if (Date.now() - Number(payload.issuedAt) > MAX_STATE_AGE_MS) throw new Error("OAuth state 已过期");
  if (!isOriginAllowed(payload.origin, env)) throw new Error("当前来源未在允许列表中");
  return payload;
};

const renderCallbackPage = ({ targetOrigin, message, isError = false }) => html(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${isError ? "Authorization Failed" : "Authorization Success"}</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      background:
        radial-gradient(circle at top left, rgba(34, 211, 238, 0.16), transparent 28%),
        radial-gradient(circle at bottom right, rgba(99, 102, 241, 0.14), transparent 32%),
        #0a0b0f;
      color: #f6f7fb;
    }
    .card {
      width: min(92vw, 540px);
      padding: 28px 24px;
      border-radius: 28px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(16, 17, 20, 0.88);
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.42);
      text-align: center;
      line-height: 1.8;
    }
    .card h1 {
      margin: 0 0 12px;
      font-size: 24px;
    }
    .card p {
      margin: 0;
      color: rgba(255, 255, 255, 0.72);
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>${isError ? "授权失败" : "授权成功"}</h1>
    <p>${isError ? "可以关闭这个弹窗后重试。" : "窗口即将自动关闭，并把登录结果返回 CMS。"}</p>
  </div>
  <script>
    (function () {
      var targetOrigin = ${JSON.stringify(targetOrigin)};
      var message = ${JSON.stringify(message)};
      if (window.opener && typeof window.opener.postMessage === "function") {
        window.opener.postMessage(message, targetOrigin || "*");
      }
      window.setTimeout(function () {
        window.close();
      }, 120);
    })();
  </script>
</body>
</html>`);

const exchangeCodeForToken = async (code, requestUrl, env) => {
  const tokenEndpoint = env.GITHUB_ACCESS_TOKEN_URL || DEFAULT_GITHUB_TOKEN_URL;
  const callbackUrl = new URL("/api/callback", requestUrl).toString();
  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: callbackUrl
    })
  });

  if (!response.ok) {
    throw new Error(`GitHub token exchange failed with ${response.status}`);
  }

  const result = await response.json();
  if (!result.access_token) {
    throw new Error(result.error_description || result.error || "GitHub 没有返回 access token");
  }

  return result.access_token;
};

const handleAuthRequest = async (request, env) => {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.STATE_SECRET) {
    return json({
      ok: false,
      error: "Missing required secrets",
      requiredSecrets: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "STATE_SECRET"]
    }, { status: 500 });
  }

  const requestOrigin = resolveOriginFromRequest(request);
  if (!isOriginAllowed(requestOrigin, env)) {
    return json({ ok: false, error: "Current origin is not allowed" }, { status: 403 });
  }

  const requestUrl = new URL(request.url);
  const callbackUrl = new URL("/api/callback", requestUrl).toString();
  const authorizeUrl = new URL(env.GITHUB_AUTHORIZE_URL || DEFAULT_GITHUB_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authorizeUrl.searchParams.set("redirect_uri", callbackUrl);
  authorizeUrl.searchParams.set("scope", "repo");
  authorizeUrl.searchParams.set("state", await createSignedState(requestOrigin, env));

  return Response.redirect(authorizeUrl.toString(), 302);
};

const handleCallbackRequest = async (request, env) => {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");

  try {
    if (!code) throw new Error("GitHub callback 缺少 code");
    const statePayload = await verifySignedState(state, env);
    const token = await exchangeCodeForToken(code, request.url, env);
    const message = `${TOKEN_POST_MESSAGE_PREFIX}${JSON.stringify({ token, provider: "github" })}`;
    return renderCallbackPage({
      targetOrigin: statePayload.origin,
      message
    });
  } catch (error) {
    const fallbackOrigin = isOriginAllowed(resolveOriginFromRequest(request), env) ? resolveOriginFromRequest(request) : "*";
    return renderCallbackPage({
      targetOrigin: fallbackOrigin,
      message: `${ERROR_POST_MESSAGE_PREFIX}${error.message || "OAuth callback failed"}`,
      isError: true
    });
  }
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/health") {
      return json({
        ok: true,
        service: "decap-oauth-worker",
        configured: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET && env.STATE_SECRET)
      });
    }

    if (request.method === "GET" && url.pathname === "/api/auth") {
      return handleAuthRequest(request, env);
    }

    if (request.method === "GET" && url.pathname === "/api/callback") {
      return handleCallbackRequest(request, env);
    }

    return json({
      ok: false,
      error: "Not found",
      availableRoutes: ["/api/health", "/api/auth", "/api/callback"]
    }, { status: 404 });
  }
};
