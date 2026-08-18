// Worker wrapper to enforce site-wide password protection before delegating to OpenNext handler
// - Protects all public routes
// - Handles GET /__muac_login (login form) and POST /__muac_login (login attempt)
// - Issues HttpOnly, Secure cookie MUAC_AUTH signed with HMAC-SHA256 derived from MUAC_SITE_PASSWORD
// - Delegates to .open-next/worker.js handler when authenticated

export default {
  async fetch(request: Request, env: any, ctx: any) {
    const url = new URL(request.url);
    const hostHeader = (request.headers.get('host') || '').split(':')[0].toLowerCase();

    // Allowed hosts: current production hostname plus optional NEXT_PUBLIC_SITE_URL
    const allowedHosts = new Set<string>(['muac.muaclife.workers.dev', '127.0.0.1', 'localhost']);
    try {
      if (env && env.NEXT_PUBLIC_SITE_URL) {
        try {
          const parsed = new URL(env.NEXT_PUBLIC_SITE_URL);
          allowedHosts.add(parsed.hostname.toLowerCase());
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      // ignore
    }

    // If host is not allowed, deny to avoid bypass via other hostnames
    if (!allowedHosts.has(hostHeader)) {
      return new Response('Access forbidden', { status: 403 });
    }

    // Helper: read cookies
    function parseCookies(cookieHeader: string | null) {
      const out: Record<string, string> = {};
      if (!cookieHeader) return out;
      for (const part of cookieHeader.split(';')) {
        const idx = part.indexOf('=');
        if (idx < 0) continue;
        const k = part.slice(0, idx).trim();
        const v = part.slice(idx + 1).trim();
        out[k] = decodeURIComponent(v);
      }
      return out;
    }

    // Crypto helpers
    const encoder = new TextEncoder();
    async function importHmacKey(secret: string) {
      return await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
      );
    }

    function bufToHex(buffer: ArrayBuffer) {
      const bytes = new Uint8Array(buffer);
      let hex = '';
      for (let i = 0; i < bytes.length; i++) {
        const h = bytes[i].toString(16).padStart(2, '0');
        hex += h;
      }
      return hex;
    }

    function base64Encode(str: string) {
      // btoa expects binary string; use TextEncoder -> uint8 -> binary string
      const bytes = encoder.encode(str);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    }

    function base64DecodeToString(b64: string) {
      try {
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const dec = new TextDecoder();
        return dec.decode(bytes);
      } catch (e) {
        return '';
      }
    }

    async function computeHmacHex(secret: string, msg: string) {
      const key = await importHmacKey(secret);
      const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(msg));
      return bufToHex(sig);
    }

    function constantTimeCompare(a: string, b: string) {
      if (a.length !== b.length) return false;
      let result = 0;
      for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
      }
      return result === 0;
    }

    const COOKIE_NAME = 'MUAC_AUTH';
    const LOGIN_PATH = '/__muac_login';
    const MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

    // Serve login page (GET) or process login (POST)
    if (url.pathname === LOGIN_PATH) {
      if (request.method === 'POST') {
        // Parse form body (application/x-www-form-urlencoded)
        let formText = '';
        try {
          const ct = request.headers.get('content-type') || '';
          if (ct.includes('application/x-www-form-urlencoded')) {
            const bodyText = await request.text();
            formText = bodyText;
          } else {
            // attempt formData
            const fd = await request.formData();
            const p = fd.get('password');
            formText = `password=${p ?? ''}`;
          }
        } catch (e) {
          // ignore
        }
        const params = new URLSearchParams(formText);
        const password = params.get('password') || '';

        if (!env || !env.MUAC_SITE_PASSWORD) {
          // Secret not configured — don't reveal details
          return new Response('Service unavailable', { status: 503 });
        }

        const correct = constantTimeCompare(password, env.MUAC_SITE_PASSWORD.toString());
        if (!correct) {
          // Return login page with message
          const body = loginPageHtml('Senha incorreta.');
          return new Response(body, {
            status: 401,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-store',
            },
          });
        }

        // Create token: payload = expirationMillis
        const expiresAt = Date.now() + MAX_AGE_SECONDS * 1000;
        const payload = String(expiresAt);
        const sigHex = await computeHmacHex(env.MUAC_SITE_PASSWORD.toString(), payload);
        const raw = `${payload}:${sigHex}`;
        const token = base64Encode(raw);
        // Set cookie. In development (NEXTJS_ENV=development) don't use Secure so preview over HTTP works.
        const isDev = env && env.NEXTJS_ENV === 'development';
        const securePart = isDev ? '' : ' Secure;';
        const cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly;${securePart} SameSite=Lax; Path=/; Max-Age=${MAX_AGE_SECONDS}`;
        const redirectTo = '/';
        return new Response(null, {
          status: 302,
          headers: {
            Location: redirectTo,
            'Set-Cookie': cookie,
            'Cache-Control': 'no-store',
          },
        });
      }

      // GET — show login form
      const body = loginPageHtml();
      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    // For all other requests: validate cookie
    const cookies = parseCookies(request.headers.get('cookie'));
    const tokenB64 = cookies[COOKIE_NAME];
    if (tokenB64) {
      try {
        const raw = base64DecodeToString(tokenB64);
        const idx = raw.lastIndexOf(':');
        if (idx > 0) {
          const payload = raw.slice(0, idx);
          const sig = raw.slice(idx + 1);
          const expires = Number(payload);
          if (!Number.isNaN(expires) && Date.now() < expires) {
            if (env && env.MUAC_SITE_PASSWORD) {
              const expectedSig = await computeHmacHex(env.MUAC_SITE_PASSWORD.toString(), payload);
              if (constantTimeCompare(expectedSig, sig)) {
                // Authenticated — delegate to OpenNext handler
                try {
                  // Delegar exclusivamente ao worker gerado pelo OpenNext

                  const openNextMod = await import("./.open-next/worker.js"); const openNextAny = openNextMod as any;
                  if (openNextAny && openNextAny.default && typeof openNextAny.default.fetch === 'function') {
                    return await openNextAny.default.fetch(request, env, ctx);
                  }
                  if (openNextAny && typeof openNextAny.fetch === 'function') {
                    return await openNextAny.fetch(request, env, ctx);
                  }
                  // Caso o worker gerado não exponha fetch, gerar erro para ser tratado pelo catch externo
                  throw new Error('OpenNext generated worker missing fetch');
                } catch (e) {
                  // Em produção, log seguro para wrangler tail sem expor segredos
                  try {
                    if (!(env && env.NEXTJS_ENV === 'development')) {
                      console.error('OpenNext delegation error:', (e && (e as any).message) ? (e as any).message : String(e));
                    }
                  } catch (logErr) {
                    // ignore logging errors
                  }
                  if (env && env.NEXTJS_ENV === 'development') {
                    const msg = (e && (e as any).stack) ? (e as any).stack : String(e);
                    return new Response('Internal Server Error\n' + msg, { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
                  }
                  return new Response('Internal Server Error', { status: 500 });
                }
              }
            }
          }
        }
      } catch (e) {
        // fallthrough to show login
      }
    }

    // Not authenticated — show login page
    const body = loginPageHtml();
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });

    // Helper: login page HTML
    function loginPageHtml(message?: string) {
      const msg = message ? `<p style="color:#c00">${escapeHtml(message)}</p>` : '';
      return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>MUAC — Protegido</title>
  <style>
    body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f7f7f7;color:#111;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
    .card{background:#fff;padding:24px;border-radius:8px;box-shadow:0 6px 24px rgba(0,0,0,0.08);max-width:420px;width:100%}
    h1{margin:0 0 8px;font-size:20px}
    p.lead{margin:0 0 16px;color:#444}
    form{display:flex;gap:8px;flex-direction:column}
    input[type=password]{padding:8px;border-radius:6px;border:1px solid #ddd}
    button{padding:10px;border-radius:6px;border:0;background:#111;color:#fff}
  </style>
</head>
<body>
  <div class="card">
    <h1>MUAC</h1>
    <p class="lead">Este espaço é privado.</p>
    ${msg}
    <form method="POST" action="${LOGIN_PATH}">
      <label for="password" style="display:none">Senha</label>
      <input id="password" name="password" type="password" autocomplete="current-password" placeholder="Senha" required />
      <button type="submit">Entrar</button>
    </form>
  </div>
</body>
</html>`;
    }

    function escapeHtml(s: string) {
      return s.replace(/[&<>\\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\\"': '&quot;' } as any)[c] || c);
    }
  }
};
