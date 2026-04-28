const PROMPTS_PREFIX = "/prompts";
const LOGIN_PATH = "/prompts/login";
const COOKIE_NAME = "prompt_library_auth";
const COOKIE_TTL_SECONDS = 60 * 60 * 24 * 7;
const encoder = new TextEncoder();

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!isPromptsPath(url.pathname)) {
      return env.ASSETS.fetch(request);
    }

    const password = env.PROMPT_LIBRARY_PASSWORD;
    if (!password) {
      return new Response("Prompt library password is not configured.", {
        status: 503,
        headers: noStoreHeaders({ "Content-Type": "text/plain; charset=utf-8" })
      });
    }

    if (request.method === "POST" && url.pathname === LOGIN_PATH) {
      return handleLogin(request, password, url);
    }

    if (await hasValidAuthCookie(request, password)) {
      if (url.pathname === PROMPTS_PREFIX) {
        return Response.redirect(new URL(`${PROMPTS_PREFIX}/`, url), 302);
      }

      const response = await env.ASSETS.fetch(request);
      return withNoStore(response);
    }

    return renderLoginPage(false);
  }
};

function isPromptsPath(pathname) {
  return pathname === PROMPTS_PREFIX || pathname === LOGIN_PATH || pathname.startsWith(`${PROMPTS_PREFIX}/`);
}

async function handleLogin(request, password, url) {
  let submitted = "";

  try {
    const form = await request.formData();
    submitted = String(form.get("password") || "");
  } catch {
    return renderLoginPage(true, 400);
  }

  if (submitted !== password) {
    return renderLoginPage(true, 401);
  }

  const expiresAt = Math.floor(Date.now() / 1000) + COOKIE_TTL_SECONDS;
  const signature = await signAuthValue(String(expiresAt), password);
  const cookie = [
    `${COOKIE_NAME}=${expiresAt}.${signature}`,
    `Max-Age=${COOKIE_TTL_SECONDS}`,
    "Path=/prompts",
    "HttpOnly",
    "SameSite=Lax",
    url.protocol === "https:" ? "Secure" : ""
  ].filter(Boolean).join("; ");

  return new Response(null, {
    status: 303,
    headers: noStoreHeaders({
      Location: `${PROMPTS_PREFIX}/`,
      "Set-Cookie": cookie
    })
  });
}

async function hasValidAuthCookie(request, password) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));

  if (!cookie) return false;

  const value = cookie.slice(COOKIE_NAME.length + 1);
  const [expiresAtText, signature] = value.split(".");
  const expiresAt = Number(expiresAtText);

  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000) || !signature) {
    return false;
  }

  const expected = await signAuthValue(expiresAtText, password);
  return constantTimeEqual(signature, expected);
}

async function signAuthValue(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return base64Url(signature);
}

function base64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function constantTimeEqual(left, right) {
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a[index] ^ b[index];
  }
  return result === 0;
}

function renderLoginPage(hasError, status = 200) {
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>提示词仓库访问验证</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #f5f6f3;
      color: #202421;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", Arial, sans-serif;
    }
    main {
      width: min(420px, calc(100vw - 32px));
      border: 1px solid #d8dfda;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 18px 60px rgba(22, 31, 27, 0.12);
      padding: 24px;
    }
    h1 { margin: 0 0 6px; font-size: 22px; line-height: 1.25; }
    p { margin: 0 0 18px; color: #657067; font-size: 14px; }
    label { display: grid; gap: 8px; color: #657067; font-size: 13px; font-weight: 700; }
    input {
      width: 100%;
      height: 42px;
      border: 1px solid #d8dfda;
      border-radius: 8px;
      padding: 0 12px;
      font: 15px inherit;
    }
    input:focus { outline: 0; border-color: #0f766e; box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.14); }
    button {
      width: 100%;
      height: 42px;
      margin-top: 14px;
      border: 1px solid #0f766e;
      border-radius: 8px;
      background: #0f766e;
      color: #fff;
      font: 700 14px inherit;
      cursor: pointer;
    }
    .error {
      margin: 0 0 12px;
      padding: 10px;
      border: 1px solid rgba(185, 28, 28, 0.25);
      border-radius: 8px;
      color: #991b1b;
      background: #fef2f2;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <main>
    <h1>提示词仓库</h1>
    <p>请输入访问密码。</p>
    ${hasError ? '<div class="error">密码不正确，请重试。</div>' : ""}
    <form method="post" action="${LOGIN_PATH}">
      <label>访问密码
        <input name="password" type="password" autocomplete="current-password" autofocus required>
      </label>
      <button type="submit">进入仓库</button>
    </form>
  </main>
</body>
</html>`;

  return new Response(html, {
    status,
    headers: noStoreHeaders({ "Content-Type": "text/html; charset=utf-8" })
  });
}

function withNoStore(response) {
  const next = new Response(response.body, response);
  next.headers.set("Cache-Control", "no-store");
  next.headers.set("CDN-Cache-Control", "no-store");
  return next;
}

function noStoreHeaders(headers = {}) {
  return {
    ...headers,
    "Cache-Control": "no-store",
    "CDN-Cache-Control": "no-store"
  };
}
