/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = parseInt(process.env.PORT || '3000', 10);

// Parse JSON and URL-encoded bodies while preserving raw bytes buffer for HMAC validation
app.use(
  express.json({
    limit: '10mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb',
    verify: (req: any, _res, buf) => {
      if (!req.rawBody) req.rawBody = buf;
    }
  })
);

// Helper to determine base URL
function getBaseUrl(req: express.Request): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
  return `${protocol}://${host}`;
}

// 1. GitHub OAuth URL endpoint
app.get('/api/auth/github/url', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID || process.env.CLIENT_ID;
  if (!clientId) {
    return res.status(400).json({
      error: 'GITHUB_CLIENT_ID is not configured in server environment.',
      needsConfig: true
    });
  }

  const clientOrigin = req.query.origin as string;
  const omitRedirectUri = req.query.omit_redirect_uri === 'true';
  const baseUrl = clientOrigin || getBaseUrl(req);
  const redirectUri = `${baseUrl.replace(/\/$/, '')}/auth/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    scope: 'repo user read:user',
    allow_signup: 'true',
    state: baseUrl
  });

  if (!omitRedirectUri) {
    params.set('redirect_uri', redirectUri);
  }

  const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
  res.json({ url: authUrl, redirectUri });
});

// Check if server has GitHub OAuth configured
app.get('/api/auth/github/config', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID || process.env.CLIENT_ID;
  const hasSecret = !!(process.env.GITHUB_CLIENT_SECRET || process.env.CLIENT_SECRET);
  res.json({
    configured: Boolean(clientId && hasSecret),
    clientId: clientId ? `${clientId.slice(0, 4)}...` : null
  });
});

// Endpoint to exchange OAuth code for access token via API
app.all(['/api/auth/github/exchange', '/api/auth/github/token'], async (req, res) => {
  const code = (req.query.code || req.body?.code) as string;
  const clientId = process.env.GITHUB_CLIENT_ID || process.env.CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET || process.env.CLIENT_SECRET;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code is required' });
  }

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'GitHub OAuth is not configured on the server' });
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code
      })
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      return res.status(400).json({ error: tokenData.error_description || tokenData.error });
    }

    res.json({ token: tokenData.access_token, ...tokenData });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Token exchange failed' });
  }
});

// 2. GitHub OAuth Callback (postMessage to popup opener)
const callbackHandler: express.RequestHandler = async (req, res) => {
  const code = req.query.code as string;
  const clientId = process.env.GITHUB_CLIENT_ID || process.env.CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET || process.env.CLIENT_SECRET;

  if (!code) {
    return res.status(400).send(`
      <html>
        <body style="font-family: sans-serif; background: #121316; color: #fff; padding: 20px; text-align: center;">
          <h2>Authentication Failed</h2>
          <p>No authorization code received from GitHub.</p>
          <script>setTimeout(() => window.close(), 3000);</script>
        </body>
      </html>
    `);
  }

  if (!clientId || !clientSecret) {
    return res.status(500).send(`
      <html>
        <body style="font-family: sans-serif; background: #121316; color: #fff; padding: 20px; text-align: center;">
          <h2>Server Configuration Missing</h2>
          <p>GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET is missing.</p>
          <script>setTimeout(() => window.close(), 4000);</script>
        </body>
      </html>
    `);
  }

  try {
    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl.replace(/\/$/, '')}/auth/callback`;

    // Exchange code with GitHub API for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code
      })
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return res.status(400).send(`
        <html>
          <body style="font-family: sans-serif; background: #121316; color: #fff; padding: 20px; text-align: center;">
            <h2>GitHub Authorization Error</h2>
            <p>${tokenData.error_description || tokenData.error}</p>
            <script>setTimeout(() => window.close(), 4000);</script>
          </body>
        </html>
      `);
    }

    const accessToken = tokenData.access_token;
    const returnOrigin = (req.query.state as string) || '';

    // Send token back to parent window using postMessage and close popup
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pluscript - GitHub Connected</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background-color: #0d1117;
              color: #c9d1d9;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            .card {
              background: #161b22;
              border: 1px solid #30363d;
              border-radius: 12px;
              padding: 24px;
              text-align: center;
              max-width: 320px;
              box-shadow: 0 8px 24px rgba(0,0,0,0.5);
            }
            .success {
              color: #3fb950;
              font-size: 24px;
              margin-bottom: 8px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="success">✓ Connected!</div>
            <p>GitHub connected successfully. Returning to Pluscript...</p>
          </div>
          <script>
            const token = ${JSON.stringify(accessToken)};
            const returnOrigin = ${JSON.stringify(returnOrigin)};
            const targetUrl = returnOrigin
              ? (returnOrigin.replace(/\/$/, '') + '/?github_token=' + encodeURIComponent(token))
              : ('/?github_token=' + encodeURIComponent(token));

            try {
              localStorage.setItem('pluscript_github_token', token);
            } catch (err) {
              console.warn('localStorage error:', err);
            }

            try {
              if (typeof BroadcastChannel !== 'undefined') {
                const bc = new BroadcastChannel('pluscript_oauth');
                bc.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'github', token: token });
                setTimeout(() => {
                  try { bc.close(); } catch(e) {}
                }, 2000);
              }
            } catch (err) {}

            try {
              if (window.opener) {
                window.opener.postMessage({
                  type: 'OAUTH_AUTH_SUCCESS',
                  provider: 'github',
                  token: token
                }, '*');
                setTimeout(() => {
                  try { window.close(); } catch(e) {}
                  window.location.replace(targetUrl);
                }, 1000);
              } else {
                setTimeout(() => {
                  window.location.replace(targetUrl);
                }, 600);
              }
            } catch (err) {
              console.error('Error posting message to opener:', err);
              setTimeout(() => {
                window.location.replace(targetUrl);
              }, 600);
            }
          </script>
        </body>
      </html>
    `);
  } catch (error: any) {
    res.status(500).send(`
      <html>
        <body style="font-family: sans-serif; background: #121316; color: #fff; padding: 20px; text-align: center;">
          <h2>Connection Error</h2>
          <p>${error?.message || 'Failed to exchange token with GitHub'}</p>
        </body>
      </html>
    `);
  }
};

app.get(['/auth/callback', '/auth/callback/'], callbackHandler);

// 3. GitHub Marketplace Webhook Endpoint
// Verified using HMAC-SHA256 signature in X-Hub-Signature-256 header.
// Must be defined BEFORE the generic /api/github proxy route.
const webhookHandler = (req: any, res: express.Response) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const webhookSecret = process.env.WEBHOOK_SECRET || process.env.GITHUB_WEBHOOK_SECRET;

  if (!signature || typeof signature !== 'string') {
    console.warn('[GitHub Webhook Warning] Webhook request missing X-Hub-Signature-256 header.');
    return res.status(401).json({
      error: 'Missing X-Hub-Signature-256 header'
    });
  }

  if (!webhookSecret) {
    console.error('[GitHub Webhook Error] WEBHOOK_SECRET is not configured in server environment variables.');
    return res.status(500).json({
      error: 'Server webhook secret is not configured in environment variables'
    });
  }

  // Obtain raw body buffer for HMAC calculation
  const rawBody: Buffer =
    req.rawBody ||
    (typeof req.body === 'string'
      ? Buffer.from(req.body)
      : Buffer.from(JSON.stringify(req.body || {})));

  const hmac = crypto.createHmac('sha256', webhookSecret);
  const expectedSignature = 'sha256=' + hmac.update(rawBody).digest('hex');

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    console.warn('[GitHub Webhook Warning] Signature verification failed. Computed digest does not match header.');
    return res.status(401).json({
      error: 'Invalid signature. Request rejected.'
    });
  }

  const githubEvent = (req.headers['x-github-event'] as string) || 'marketplace_purchase';

  // Handle GitHub initial test ping
  if (githubEvent === 'ping') {
    console.log('[GitHub Webhook] Ping event received successfully from GitHub:', req.body?.zen || 'ok');
    return res.status(200).json({
      received: true,
      message: 'Ping event verified and received successfully.'
    });
  }

  // Parse marketplace_purchase event payload
  const { action, marketplace_purchase, sender } = req.body || {};
  const accountLogin =
    marketplace_purchase?.account?.login || sender?.login || 'unknown';
  const accountType = marketplace_purchase?.account?.type || 'User';
  const planName = marketplace_purchase?.plan?.name || 'Free';
  const planId = marketplace_purchase?.plan?.id;

  console.log(
    `[GitHub Marketplace Webhook] Verified event: ${githubEvent} | Action: ${action} | Account: ${accountLogin} (${accountType}) | Plan: ${planName} (ID: ${planId})`
  );

  switch (action) {
    case 'purchased':
      console.log(`[GitHub Marketplace] Account "${accountLogin}" purchased/installed plan "${planName}".`);
      break;
    case 'cancelled':
      console.log(`[GitHub Marketplace] Account "${accountLogin}" cancelled plan subscription.`);
      break;
    case 'changed':
      console.log(`[GitHub Marketplace] Account "${accountLogin}" changed plan to "${planName}".`);
      break;
    case 'pending_change':
      console.log(`[GitHub Marketplace] Account "${accountLogin}" pending change to plan "${planName}".`);
      break;
    case 'pending_change_cancelled':
      console.log(`[GitHub Marketplace] Account "${accountLogin}" cancelled pending change.`);
      break;
    default:
      console.log(`[GitHub Marketplace] Received action: "${action}" for account "${accountLogin}".`);
      break;
  }

  // 200 OK acknowledges successful receipt to GitHub
  return res.status(200).json({
    received: true,
    event: githubEvent,
    action: action || null,
    account: accountLogin
  });
};

app.post(['/api/webhook', '/api/github/webhook', '/webhook'], webhookHandler);

// Informational GET endpoint for testing/uptime monitors
app.get(['/api/webhook', '/api/github/webhook', '/webhook'], (_req, res) => {
  res.status(200).json({
    status: 'active',
    endpoint: '/api/webhook',
    description: 'GitHub Marketplace Webhook receiver. Send POST requests with X-Hub-Signature-256 header.'
  });
});

// 4. GitHub Proxy Routes (supports Bearer token passed in headers)
app.use('/api/github', async (req, res, next) => {
  // Explicitly ignore any webhook requests
  if (req.path === '/webhook' || req.path.startsWith('/webhook') || req.url.includes('webhook')) {
    return next();
  }

  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || '';
  const targetPath = req.url.replace(/^\//, '');
  const githubApiUrl = `https://api.github.com/${targetPath}`;

  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Pluscript-App'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body && Object.keys(req.body).length > 0) {
      headers['Content-Type'] = 'application/json';
      fetchOptions.body = JSON.stringify(req.body);
    }

    const githubRes = await fetch(githubApiUrl, fetchOptions);
    const contentType = githubRes.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await githubRes.json();
      return res.status(githubRes.status).json(data);
    } else {
      const text = await githubRes.text();
      return res.status(githubRes.status).send(text);
    }
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'GitHub proxy request failed' });
  }
});

// Vite middleware or static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server }
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ Pluscript server listening on port ${PORT}`);
  });
}

startServer();
