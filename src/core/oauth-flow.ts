import * as crypto from "node:crypto";
import * as http from "node:http";
import * as vscode from "vscode";
import type { OAuthTokens } from "../types.js";
import { USSBridge } from "./uss-bridge.js";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/cloud-platform",
].join(" ");

function escapeHtml(str: string): string {
  return str.replace(/[&<>'"]/g, (tag) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[tag] || tag));
}

function buildSuccessHtml(email: string): string {
  const safeEmail = escapeHtml(email);
  const initial = (email[0] || "A").toUpperCase();

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AgyPool — Kết Nối Thành Công</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #06080f;
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      padding: 24px;
    }
    .glow-1 {
      position: absolute;
      top: -20%;
      left: 10%;
      width: 550px;
      height: 550px;
      background: radial-gradient(circle, rgba(6, 182, 212, 0.25) 0%, transparent 70%);
      filter: blur(80px);
      pointer-events: none;
      animation: pulseGlow 8s ease-in-out infinite alternate;
    }
    .glow-2 {
      position: absolute;
      bottom: -20%;
      right: 10%;
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, transparent 70%);
      filter: blur(90px);
      pointer-events: none;
      animation: pulseGlow 10s ease-in-out infinite alternate-reverse;
    }
    .grid-pattern {
      position: absolute;
      inset: 0;
      background-image: 
        linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
      background-size: 36px 36px;
      mask-image: radial-gradient(circle at center, black 40%, transparent 80%);
      -webkit-mask-image: radial-gradient(circle at center, black 40%, transparent 80%);
      pointer-events: none;
    }
    @keyframes pulseGlow {
      0% { transform: scale(1) translate(0, 0); opacity: 0.8; }
      100% { transform: scale(1.15) translate(30px, 20px); opacity: 1; }
    }
    .card {
      position: relative;
      z-index: 10;
      width: 100%;
      max-width: 460px;
      background: rgba(13, 18, 30, 0.8);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 24px;
      padding: 38px 30px;
      text-align: center;
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      box-shadow: 
        0 24px 64px rgba(0, 0, 0, 0.7),
        0 0 40px rgba(6, 182, 212, 0.15),
        inset 0 1px 0 rgba(255, 255, 255, 0.12);
      animation: cardIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes cardIn {
      from { opacity: 0; transform: translateY(20px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .icon-box {
      position: relative;
      width: 80px;
      height: 80px;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon-halo {
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      background: conic-gradient(from 0deg, #00f2fe, #38bdf8, #8b5cf6, #10b981, #00f2fe);
      filter: blur(10px);
      opacity: 0.65;
      animation: spinHalo 8s linear infinite;
    }
    .icon-inner {
      position: relative;
      width: 72px;
      height: 72px;
      background: #080b14;
      border: 1.5px solid rgba(56, 189, 248, 0.4);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: inset 0 0 16px rgba(16, 185, 129, 0.25);
    }
    @keyframes spinHalo { 100% { transform: rotate(360deg); } }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 999px;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.25);
      color: #38bdf8;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
    }
    h1 {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.3px;
      background: linear-gradient(135deg, #ffffff 40%, #94a3b8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
    }
    .desc {
      font-size: 13px;
      color: #94a3b8;
      line-height: 1.5;
      margin-bottom: 22px;
    }
    .acc-card {
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(56, 189, 248, 0.22);
      border-radius: 14px;
      padding: 12px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 22px;
      text-align: left;
    }
    .avatar {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: linear-gradient(135deg, #0284c7, #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 16px;
      color: #fff;
      box-shadow: 0 0 12px rgba(2, 132, 199, 0.45);
      flex-shrink: 0;
    }
    .acc-details {
      flex: 1;
      overflow: hidden;
    }
    .email-txt {
      font-family: monospace;
      font-size: 13px;
      font-weight: 600;
      color: #f1f5f9;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .status-txt {
      font-size: 11px;
      color: #10b981;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 2px;
    }
    .btn-close {
      width: 100%;
      padding: 12px 20px;
      border-radius: 12px;
      background: linear-gradient(135deg, #0284c7, #2563eb);
      color: #fff;
      font-size: 13.5px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);
      transition: all 0.2s ease;
    }
    .btn-close:hover {
      background: linear-gradient(135deg, #0369a1, #1d4ed8);
      transform: translateY(-1px);
      box-shadow: 0 8px 24px rgba(37, 99, 235, 0.45);
    }
    .btn-close:active { transform: translateY(1px); }
    .auto-close {
      margin-top: 12px;
      font-size: 11.5px;
      color: #64748b;
    }
    .footer {
      margin-top: 22px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      font-size: 11px;
      color: #64748b;
    }
    .footer span { color: #94a3b8; font-weight: 600; }
  </style>
</head>
<body>
  <div class="glow-1"></div>
  <div class="glow-2"></div>
  <div class="grid-pattern"></div>

  <div class="card">
    <div class="icon-box">
      <div class="icon-halo"></div>
      <div class="icon-inner">
        <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
    </div>

    <div class="badge">
      <span class="badge-dot"></span>
      <span>AgyPool Engine</span>
    </div>

    <h1>Ủy Quyền Thành Công!</h1>
    <p class="desc">Tài khoản Google đã được kết nối an toàn vào Antigravity Account Pool.</p>

    <div class="acc-card">
      <div class="avatar">${initial}</div>
      <div class="acc-details">
        <div class="email-txt" title="${safeEmail}">${safeEmail}</div>
        <div class="status-txt">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
            <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
          </svg>
          Sẵn sàng luân chuyển Quota
        </div>
      </div>
    </div>

    <button class="btn-close" onclick="window.close()">
      <span>Đóng Tab Này</span>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>

    <div class="auto-close">Tự động đóng sau <span id="sec">5</span> giây...</div>

    <div class="footer">
      <span>AgyPool v1.4.2</span> • Tác giả: <span>Hồ Đức Vinh</span>
    </div>
  </div>

  <script>
    let s = 5;
    const el = document.getElementById('sec');
    const timer = setInterval(() => {
      s--;
      if (el) el.textContent = s;
      if (s <= 0) {
        clearInterval(timer);
        window.close();
      }
    }, 1000);
  </script>
</body>
</html>`;
}

function buildErrorHtml(detail: string): string {
  const safeDetail = escapeHtml(detail);
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AgyPool — Kết Nối Thất Bại</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #090a12;
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      width: 100%;
      max-width: 440px;
      background: rgba(18, 22, 34, 0.85);
      border: 1px solid rgba(239, 68, 68, 0.35);
      border-radius: 20px;
      padding: 32px 24px;
      text-align: center;
      backdrop-filter: blur(20px);
      box-shadow: 0 20px 50px rgba(0,0,0,0.6), 0 0 30px rgba(239, 68, 68, 0.15);
    }
    .icon-err {
      width: 64px;
      height: 64px;
      margin: 0 auto 16px;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.4);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ef4444;
    }
    h1 { font-size: 20px; margin-bottom: 8px; color: #f87171; }
    p { font-size: 13px; color: #94a3b8; line-height: 1.5; margin-bottom: 20px; }
    .err-box {
      background: rgba(0, 0, 0, 0.3);
      border-radius: 8px;
      padding: 10px;
      font-family: monospace;
      font-size: 12px;
      color: #fca5a5;
      margin-bottom: 20px;
      word-break: break-all;
    }
    .btn {
      padding: 10px 20px;
      border-radius: 10px;
      background: #334155;
      color: #fff;
      border: none;
      cursor: pointer;
      font-weight: 600;
    }
    .btn:hover { background: #475569; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-err">
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    </div>
    <h1>Ủy Quyền Thất Bại</h1>
    <p>Không thể hoàn tất quá trình xác thực OAuth với Google.</p>
    <div class="err-box">${safeDetail}</div>
    <button class="btn" onclick="window.close()">Đóng Tab Này</button>
  </div>
</body>
</html>`;
}

export interface OAuthFlowResult {
  email: string;
  tokens: OAuthTokens;
}

async function requestToken(params: URLSearchParams): Promise<OAuthTokens> {
  const creds = USSBridge.getClientCredentials();
  params.set("client_id", creds.clientId);
  if (creds.clientSecret) params.set("client_secret", creds.clientSecret);
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Token request failed HTTP ${res.status}: ${await res.text()}`);
  // SAFETY: Google OAuth token endpoint response payload
  const data = (await res.json()) as { access_token: string; expires_in?: number; refresh_token?: string; token_type?: string };
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || params.get("refresh_token") || "",
    expiryDateSeconds: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
    tokenType: data.token_type || "Bearer",
  };
}

async function fetchUserEmail(accessToken: string): Promise<string> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Failed to fetch user email (HTTP ${res.status})`);
  // SAFETY: Google userinfo endpoint returns profile with email string
  const data = (await res.json()) as { email?: string };
  if (!data.email) throw new Error("No email found in profile");
  return data.email;
}

export const OAuthFlow = {
  startLogin(): Promise<OAuthFlowResult> {
    return new Promise((resolve, reject) => {
      let server: http.Server | null = null;
      let timeout: NodeJS.Timeout | null = null;
      const expectedState = crypto.randomBytes(16).toString("hex");

      const cleanup = () => {
        if (timeout) clearTimeout(timeout);
        server?.close();
      };

      server = http.createServer(async (req, res) => {
        try {
          const reqUrl = new URL(req.url || "/", "http://127.0.0.1");
          if (reqUrl.pathname !== "/oauth2callback") {
            res.writeHead(404).end("Not Found");
            return;
          }
          const code = reqUrl.searchParams.get("code");
          const state = reqUrl.searchParams.get("state");
          const error = reqUrl.searchParams.get("error");
          if (error || !code || state !== expectedState) {
            const errDetail = error || (state !== expectedState ? "Invalid OAuth state" : "Missing code");
            res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" }).end(buildErrorHtml(errDetail));
            cleanup();
            reject(new Error(error ? `OAuth error: ${error}` : errDetail));
            return;
          }

          // SAFETY: HTTP server address on TCP socket returns AddressInfo object with port
          const addr = server?.address() as { port: number } | null;
          const redirectUri = `http://127.0.0.1:${addr?.port || 0}/oauth2callback`;
          const tokens = await requestToken(new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }));
          const email = await fetchUserEmail(tokens.accessToken);

          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(buildSuccessHtml(email));
          cleanup();
          resolve({ email, tokens });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          res.writeHead(500, { "Content-Type": "text/html; charset=utf-8" }).end(buildErrorHtml(`Auth Error: ${msg}`));
          cleanup();
          reject(err);
        }
      });

      server.listen(0, "127.0.0.1", () => {
        // SAFETY: HTTP server address on TCP socket returns AddressInfo object with port
        const addr = server?.address() as { port: number } | null;
        const port = addr?.port || 0;
        const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;
        const creds = USSBridge.getClientCredentials();
        const authParams = new URLSearchParams({
          client_id: creds.clientId,
          redirect_uri: redirectUri,
          response_type: "code",
          scope: SCOPES,
          access_type: "offline",
          prompt: "consent",
          state: expectedState,
        });

        const authUrl = `${GOOGLE_AUTH_URL}?${authParams.toString()}`;
        void vscode.env.openExternal(vscode.Uri.parse(authUrl)).then(
          (opened) => { if (!opened) void vscode.env.clipboard.writeText(authUrl); },
          () => void vscode.env.clipboard.writeText(authUrl),
        );
        timeout = setTimeout(() => { cleanup(); reject(new Error("Login timed out after 3 minutes")); }, 180000);
      });

      server.on("error", (err) => { cleanup(); reject(err); });
    });
  },
};

