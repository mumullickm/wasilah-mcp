import { TOOLS, callTool } from './mcp.js';
import { FAVICON_PNG_BASE64 } from './favicon.js';
import { LOGO_SVG } from './logo.js';

const SERVER_INFO = { name: 'wasilah', title: 'Wasilah', version: '0.1.0' };
const PROTOCOL_VERSION = '2025-06-18';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Mcp-Session-Id, Mcp-Protocol-Version, Authorization',
  'Access-Control-Max-Age': '86400',
};

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function rpcResult(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function rpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

async function handleRpc(msg) {
  const { id, method, params } = msg;

  // Notifications carry no id and expect no response.
  if (id === undefined || id === null) {
    return null;
  }

  switch (method) {
    case 'initialize':
      return rpcResult(id, {
        protocolVersion: params?.protocolVersion || PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
      });

    case 'tools/list':
      return rpcResult(id, { tools: TOOLS });

    case 'tools/call': {
      const name = params?.name;
      const args = params?.arguments || {};
      try {
        const text = await callTool(name, args);
        return rpcResult(id, { content: [{ type: 'text', text }] });
      } catch (err) {
        return rpcResult(id, {
          content: [{ type: 'text', text: `Error: ${err.message}` }],
          isError: true,
        });
      }
    }

    case 'ping':
      return rpcResult(id, {});

    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

async function handleMcpPost(request) {
  let body;
  try {
    body = await request.json();
  } catch (_) {
    return json(rpcError(null, -32700, 'Parse error'), 400);
  }

  if (Array.isArray(body)) {
    const responses = [];
    for (const msg of body) {
      const r = await handleRpc(msg);
      if (r) responses.push(r);
    }
    if (responses.length === 0) return new Response(null, { status: 202, headers: CORS });
    return json(responses);
  }

  const response = await handleRpc(body);
  if (!response) return new Response(null, { status: 202, headers: CORS });
  return json(response);
}

function landingPage(origin) {
  const mcpUrl = `${origin}/mcp`;
  const toolRows = TOOLS.map(
    (t) => `<li><code>${t.name}</code><span>${t.description}</span></li>`
  ).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Wasilah Connector</title>
<link rel="icon" type="image/png" href="/favicon.png">
<style>
  :root { --emerald:#004B49; --emerald-dark:#00302F; --gold:#F1D592; --cream:#F4F0E0; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--emerald-dark); color: var(--cream); line-height:1.6; }
  .wrap { max-width: 760px; margin: 0 auto; padding: 64px 24px 96px; }
  h1 { color: var(--gold); font-size: 2.4rem; margin: 0 0 4px; letter-spacing:-0.01em; }
  .sub { color: var(--cream); opacity:0.8; margin:0 0 40px; }
  h2 { color: var(--gold); font-size: 1.1rem; margin: 40px 0 12px; text-transform: uppercase; letter-spacing:0.08em; }
  .card { background: var(--emerald); border:1px solid rgba(241,213,146,0.18); border-radius:14px; padding:20px 22px; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--gold); }
  .url { display:block; background: var(--emerald-dark); padding:14px 16px; border-radius:10px;
    border:1px solid rgba(241,213,146,0.25); word-break: break-all; font-size:0.95rem; }
  ul { list-style:none; padding:0; margin:0; }
  ul li { padding:14px 0; border-bottom:1px solid rgba(241,213,146,0.12); }
  ul li:last-child { border-bottom:none; }
  ul li code { display:block; margin-bottom:2px; }
  ul li span { opacity:0.82; font-size:0.95rem; }
  ol { padding-left:20px; }
  ol li { margin-bottom:8px; }
  footer { margin-top:48px; opacity:0.6; font-size:0.85rem; }
  a { color: var(--gold); }
</style>
</head>
<body>
  <div class="wrap">
    <h1>Wasilah Connector</h1>
    <p class="sub">Prayer times, Qibla, Hijri date, and Quran audio for Claude, computed with the Wasilah app's own engine.</p>

    <h2>Connector URL</h2>
    <div class="card"><code class="url">${mcpUrl}</code></div>

    <h2>Add it to Claude</h2>
    <div class="card">
      <ol>
        <li>Open Claude, then Settings, then Connectors.</li>
        <li>Choose Add custom connector.</li>
        <li>Paste the URL above and save.</li>
        <li>Ask Claude something like "What time is Maghrib in Dhaka today?"</li>
      </ol>
    </div>

    <h2>Tools</h2>
    <div class="card"><ul>${toolRows}</ul></div>

    <footer>Wasilah is a sadaqah jariyah project. Prayer times match the app's on-device calculation.<br><a href="/privacy">Privacy</a> &middot; <a href="/terms">Terms</a></footer>
  </div>
</body>
</html>`;
}

function legalPage(title, paragraphs) {
  const body = paragraphs.map((p) => `<p>${p}</p>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Wasilah Connector - ${title}</title>
<link rel="icon" type="image/png" href="/favicon.png">
<style>
  :root { --emerald:#004B49; --emerald-dark:#00302F; --gold:#F1D592; --cream:#F4F0E0; }
  body { margin:0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: var(--emerald-dark); color: var(--cream); line-height:1.7; }
  .wrap { max-width: 680px; margin: 0 auto; padding: 64px 24px 96px; }
  h1 { color: var(--gold); font-size: 1.8rem; margin: 0 0 8px; }
  .updated { opacity:0.6; font-size:0.85rem; margin:0 0 32px; }
  p { margin: 0 0 16px; }
  a { color: var(--gold); }
  .back { display:inline-block; margin-top:24px; opacity:0.8; font-size:0.9rem; }
</style>
</head>
<body>
  <div class="wrap">
    <h1>Wasilah Connector ${title}</h1>
    <p class="updated">Last updated 15 June 2026</p>
    ${body}
    <a class="back" href="/">Back to the connector</a>
  </div>
</body>
</html>`;
}

const PRIVACY = [
  'The Wasilah connector does not collect, store, or share any personal information. There are no accounts, no sign-in, no tracking, and no logs of your questions.',
  'It is stateless. Every request is handled independently and nothing is retained after it is answered.',
  'It exposes only public reference data: prayer times, Qibla direction, the Hijri date, and Quran recitation links. It has no access to your device, your location history, your files, or the on-device data inside the Wasilah app.',
  'The connector makes no outbound network calls of its own. City lookups use a bundled offline database, and prayer times, Qibla, and the Hijri date are computed on the server. Quran audio links point to the islamic.network content delivery network, which only your own client fetches if you open them; the connector itself never contacts it.',
  'Questions: mumullickm@gmail.com. The Wasilah app has its own privacy policy at <a href="https://wasilah.site/privacy/">wasilah.site/privacy</a>.',
];

const TERMS = [
  'The Wasilah connector is provided free of charge as part of the Wasilah project, a sadaqah jariyah. There is no fee and no subscription.',
  'It returns Islamic reference data for convenience. Prayer times are computed astronomically and may differ slightly from a local authority. For your religious obligations, confirm timings with your local masjid.',
  'The service is provided as is, without warranty and without a guarantee of availability or uptime.',
  'Questions: mumullickm@gmail.com. The Wasilah app terms are at <a href="https://wasilah.site/terms/">wasilah.site/terms</a>.',
];

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (url.pathname === '/mcp') {
      if (request.method === 'POST') return handleMcpPost(request);
      // The Streamable HTTP GET stream is optional; this server is stateless.
      return new Response('Method Not Allowed', { status: 405, headers: CORS });
    }

    if (url.pathname === '/favicon.ico' || url.pathname === '/favicon.png') {
      const bytes = Uint8Array.from(atob(FAVICON_PNG_BASE64), (c) => c.charCodeAt(0));
      return new Response(bytes, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400',
          ...CORS,
        },
      });
    }

    if (url.pathname === '/logo.svg') {
      return new Response(LOGO_SVG, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=86400',
          ...CORS,
        },
      });
    }

    if (url.pathname === '/google448255bfbea3c4ca.html') {
      return new Response(
        'google-site-verification: google448255bfbea3c4ca.html',
        { headers: { 'Content-Type': 'text/html; charset=utf-8', ...CORS } }
      );
    }

    if (url.pathname === '/sitemap.xml') {
      const urls = ['/', '/privacy', '/terms']
        .map((p) => `  <url><loc>https://wasilah-mcp.aykiz.workers.dev${p}</loc></url>`)
        .join('\n');
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
      return new Response(xml, {
        headers: { 'Content-Type': 'application/xml; charset=utf-8', ...CORS },
      });
    }

    if (url.pathname === '/robots.txt') {
      return new Response(
        'User-agent: *\nAllow: /\nSitemap: https://wasilah-mcp.aykiz.workers.dev/sitemap.xml\n',
        { headers: { 'Content-Type': 'text/plain; charset=utf-8', ...CORS } }
      );
    }

    if (url.pathname === '/health') {
      return json({ status: 'ok', server: SERVER_INFO });
    }

    if (url.pathname === '/privacy' && request.method === 'GET') {
      return new Response(legalPage('Privacy', PRIVACY), {
        headers: { 'Content-Type': 'text/html; charset=utf-8', ...CORS },
      });
    }

    if (url.pathname === '/terms' && request.method === 'GET') {
      return new Response(legalPage('Terms', TERMS), {
        headers: { 'Content-Type': 'text/html; charset=utf-8', ...CORS },
      });
    }

    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(landingPage(url.origin), {
        headers: { 'Content-Type': 'text/html; charset=utf-8', ...CORS },
      });
    }

    return new Response('Not Found', { status: 404, headers: CORS });
  },
};
