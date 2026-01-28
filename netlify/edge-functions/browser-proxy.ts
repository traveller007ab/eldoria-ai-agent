interface ProxyRequest {
  url: string;
  userId?: string;
}

const ALLOWED_DOMAINS = [
  // Research & Reference
  'wikipedia.org',
  'en.wikipedia.org',
  'wikimedia.org',
  'wikidata.org',
  'wiktionary.org',
  'github.com',
  'githubusercontent.com',
  'stackoverflow.com',
  'docs.python.org',
  'developer.mozilla.org',
  'arxiv.org',
  'scholar.google.com',
  'gstatic.com',
  'googleusercontent.com',
  'pubmed.ncbi.nlm.nih.gov',
  'nature.com',
  'science.org',
  'jstor.org',
  'medium.com',
  'dev.to',
  'blog.logrocket.com',
  'css-tricks.com',
  'smashingmagazine.com',
  // Tech & Development
  'netlify.com',
  'vercel.com',
  'reactjs.org',
  'react.dev',
  'typescriptlang.org',
  'nodejs.org',
  'npmjs.com',
  'yarnpkg.com',
  'docker.com',
  'kubernetes.io',
  'aws.amazon.com',
  'cloudflare.com',
  // Search Engines
  'google.com',
  'www.google.com',
  'duckduckgo.com',
  'bing.com',
  'yahoo.com',
  'baidu.com',
  // Social
  'twitter.com',
  'x.com',
  'reddit.com',
  'linkedin.com',
  'facebook.com',
  'instagram.com',
  // Video & Media
  'youtube.com',
  'vimeo.com',
  'twitch.tv',
  'dailymotion.com',
  // Shopping & Other
  'amazon.com',
  'ebay.com',
  'openstreetmap.org',
  'archive.org',
  // Testing
  'example.com',
  'example.org',
  'test.com',
];

const BLOCKED_PATTERNS = [
  /^(localhost|127\.0\.0\.1|0\.0\.0\.0)/i,
  /^192\.168\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^::1/,
  /^fe80:/,
];

// Pre-compile domain regex outside the handler to save CPU time
const DOMAIN_PATTERN = ALLOWED_DOMAINS.map(d => d.replace(/\./g, '\\.')).join('|');
const PROXY_PREFIX = `/api/browser-proxy?url=`;

/**
 * Single-pass high-performance transformation
 * Scans the HTML string once to avoid multiple expensive global replacements
 */
function transformHTML(html: string, effectiveUrl: string): string {
  const urlObj = new URL(effectiveUrl);
  const baseTag = `<base href="${effectiveUrl}">`;

  // Inject base tag as early as possible
  html = html.replace(/<head>/i, `<head>${baseTag}`);

  const combinedRegex = new RegExp(
    `href="\\/([^"]*)"|` +                     // Group 1: relative href
    `src="\\/([^"]*)"|` +                      // Group 2: relative src
    `href="(https?:\\/\\/([^"\\/]*\\.)?(${DOMAIN_PATTERN})[^"]*)"|` + // Group 3: absolute white-listed href
    `\\sintegrity="[^"]*"|` +                  // SRI
    `\\scrossorigin="[^"]*"|` +                // SRI helper
    `(src="|href=")\\/\\/([^"]*")`,            // Group 6, 7: protocol-relative
    'gi'
  );

  html = html.replace(combinedRegex, (match, relHref, relSrc, absHref, absDomain, absDomainFull, protPrefix, protRest) => {
    if (relHref !== undefined) {
      const full = `${urlObj.origin}/${relHref}`;
      return `href="${PROXY_PREFIX}${encodeURIComponent(full)}"`;
    }
    if (relSrc !== undefined) {
      return `src="${urlObj.origin}/${relSrc}"`;
    }
    if (absHref !== undefined) {
      return `href="${PROXY_PREFIX}${encodeURIComponent(absHref)}"`;
    }
    if (protPrefix !== undefined) {
      return `${protPrefix}https://${protRest}`;
    }
    return ''; // Strips integrity/crossorigin
  });

  // Inject integration script
  const integrationScript = `
    <script>
      (function() {
        if (window.top !== window.self) {
          try {
            Object.defineProperty(window, 'top', { get: function() { return window.self; } });
            Object.defineProperty(window, 'parent', { get: function() { return window.self; } });
          } catch(e) {}
        }
        
        window.addEventListener('message', (event) => {
          if (event.data.type === 'ELDORIA_COMMAND') {
            switch(event.data.command) {
              case 'EXTRACT_TEXT':
                event.source.postMessage({ type: 'ELDORIA_RESPONSE', data: { text: document.body.innerText } }, '*');
                break;
            }
          }
        });

        function reportMetadata() {
          window.parent.postMessage({
            type: 'ELDORIA_PAGE_METADATA',
            data: { title: document.title }
          }, '*');
        }
        if (document.readyState === 'complete') reportMetadata();
        else window.addEventListener('load', reportMetadata);
      })();
    </script>
  `;

  html = html.replace(/<\/body>/i, `${integrationScript}</body>`);

  // Minimal neutralize to avoid CPU overhead
  html = html.replace(/if\s*\(\s*(?:window\.)?top\s*!==?\s*(?:window\.)?self/gi, 'if (false');
  html = html.replace(/top\.location\s*=/gi, 'self.location =');

  return html;
}

function createErrorPage(message: string): string {
  return `<!DOCTYPE html><html><body style="background:#020617;color:#94a3b8;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
    <div style="text-align:center;padding:2rem;border:1px solid #1e293b;border-radius:1rem;background:#0f172a">
      <h1 style="color:#ef4444">Browser Error</h1><p>${message}</p>
    </div></body></html>`;
}

export default async (request: Request) => {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'X-Frame-Options': 'ALLOWALL'
  };

  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    if (!targetUrl) return new Response('Missing target URL', { status: 400, headers: corsHeaders });

    const parsedTarget = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
    const hostname = parsedTarget.hostname.toLowerCase();

    const isAllowed = ALLOWED_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith(`.${domain}`)
    );

    if (!isAllowed) return new Response(`Domain ${hostname} not whitelisted.`, { status: 403, headers: corsHeaders });

    const controller = new AbortController();
    const fetchTimeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(parsedTarget.href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: controller.signal,
    });
    clearTimeout(fetchTimeout);

    if (!response.ok) return new Response(createErrorPage(`Site returned ${response.status}`), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/html' } });

    const contentType = response.headers.get('Content-Type') || '';
    if (!contentType.includes('text/html')) return new Response('Only HTML can be proxied', { status: 400, headers: corsHeaders });

    let html = await response.text();

    // IMPORTANT: Use response.url (NOT parsedTarget) to handle redirects (e.g. en.wikipedia.org) correctly
    html = transformHTML(html, response.url);

    const responseHeaders = new Headers(corsHeaders);
    responseHeaders.set('Content-Type', 'text/html; charset=utf-8');
    responseHeaders.set('X-Proxied-By', 'Eldoria-Neural-Bridge/3.0');

    // Aggressively strip multiple levels of security headers
    responseHeaders.delete('X-Frame-Options');
    responseHeaders.delete('Content-Security-Policy');
    responseHeaders.delete('X-Content-Security-Policy');
    responseHeaders.delete('Content-Security-Policy-Report-Only');
    responseHeaders.delete('Cross-Origin-Opener-Policy');
    responseHeaders.delete('Cross-Origin-Resource-Policy');
    responseHeaders.delete('Cross-Origin-Embedder-Policy');

    return new Response(html, { status: 200, headers: responseHeaders });

  } catch (error) {
    return new Response(createErrorPage(error instanceof Error ? error.message : 'Network failure'), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/html' } });
  }
};

export const config = {
  path: "/api/browser-proxy",
  cache: "off",
};
