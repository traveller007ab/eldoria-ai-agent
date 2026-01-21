interface ProxyRequest {
  url: string;
  userId?: string;
}

const ALLOWED_DOMAINS = [
  // Research & Reference
  'wikipedia.org',
  'en.wikipedia.org',
  'wiktionary.org',
  'github.com',
  'stackoverflow.com',
  'docs.python.org',
  'developer.mozilla.org',
  'arxiv.org',
  'scholar.google.com',
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
  'wikipedia.org',
  'wikidata.org',
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

function transformHTML(html: string, baseUrl: string): string {
  const baseUrlObj = new URL(baseUrl);
  const baseTag = `<base href="${baseUrl}" target="_blank">`;
  
  // Inject base tag FIRST to handle all relative URLs
  html = html.replace(/<head>/i, `<head>${baseTag}`);

  // Fix any existing base tags
  html = html.replace(/<base[^>]*>/gi, baseTag);

  // Fix relative URLs in href (links)
  html = html.replace(/(href=")\/([^"]*")/gi, `$1${baseUrlObj.origin}/$2`);
  // Fix relative URLs in src (scripts, images, styles)
  html = html.replace(/(src=")\/([^"]*")/gi, `$1${baseUrlObj.origin}/$2`);
  // Fix CSS @import
  html = html.replace(/(@import\s+["'])\/([^"']*["'])/gi, `$1${baseUrlObj.origin}/$2`);

  const integrationScript = `
    <script>
      (function() {
        if (window.top !== window.self) {
          Object.defineProperty(window, 'top', {
            get: function() { return window.self; }
          });
          Object.defineProperty(window, 'parent', {
            get: function() { return window.self; }
          });
        }

        window.addEventListener('message', (event) => {
          if (event.data.type === 'ELDORIA_COMMAND') {
            switch(event.data.command) {
              case 'EXTRACT_TEXT':
                const text = document.body.innerText;
                event.source.postMessage({
                  type: 'ELDORIA_RESPONSE',
                  data: { text }
                }, '*');
                break;
              case 'GET_SELECTION':
                const selection = window.getSelection()?.toString();
                event.source.postMessage({
                  type: 'ELDORIA_RESPONSE',
                  data: { selection }
                }, '*');
                break;
              case 'SCROLL_PERCENT':
                const percent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
                event.source.postMessage({
                  type: 'ELDORIA_RESPONSE',
                  data: { scrollPercent: percent }
                }, '*');
                break;
            }
          }
        });

        function reportMetadata() {
          const metadata = {
            title: document.title,
            description: document.querySelector('meta[name="description"]')?.getAttribute('content'),
            keywords: document.querySelector('meta[name="keywords"]')?.getAttribute('content'),
            author: document.querySelector('meta[name="author"]')?.getAttribute('content'),
            canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
            ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content'),
          };
          window.parent.postMessage({
            type: 'ELDORIA_PAGE_METADATA',
            data: metadata
          }, '*');
        }

        if (document.readyState === 'complete') {
          reportMetadata();
        } else {
          window.addEventListener('load', reportMetadata);
        }

        let scrollTimeout;
        window.addEventListener('scroll', () => {
          clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(() => {
            const percent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
            window.parent.postMessage({
              type: 'ELDORIA_SCROLL',
              data: { scrollPercent: percent }
            }, '*');
          }, 200);
        });

        document.addEventListener('selectionchange', () => {
          const selection = window.getSelection()?.toString();
          if (selection && selection.length > 0) {
            window.parent.postMessage({
              type: 'ELDORIA_SELECTION',
              data: { selection }
            }, '*');
          }
        });
      })();
    </script>
  `;
  html = html.replace(/<\/body>/i, `${integrationScript}</body>`);

  html = html.replace(/if\s*\(\s*(?:window\.)?top\s*!==?\s*(?:window\.)?self/gi, 'if (false');
  html = html.replace(/if\s*\(\s*(?:window\.)?self\s*!==?\s*(?:window\.)?top/gi, 'if (false');
  html = html.replace(/top\.location\s*=/gi, 'self.location =');
  html = html.replace(/window\.top\.location/gi, 'window.self.location');

  return html;
}

function createErrorPage(message: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Proxy Error</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .error-container {
          text-align: center;
          padding: 2rem;
          background: rgba(255,255,255,0.1);
          border-radius: 1rem;
          backdrop-filter: blur(10px);
        }
        h1 { margin: 0 0 1rem 0; }
        p { margin: 0; opacity: 0.9; }
      </style>
    </head>
    <body>
      <div class="error-container">
        <h1>Browser Error</h1>
        <p>${message}</p>
        <p style="margin-top: 1rem; font-size: 0.9rem;">Try reloading or contact support</p>
      </div>
    </body>
    </html>
  `;
}

export default async (request: Request) => {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('url');
  
  console.log('[proxy] Request URL:', request.url);
  console.log('[proxy] targetUrl param:', targetUrl);
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'X-Proxy-Debug': 'true',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!targetUrl) {
      return new Response('Missing url parameter', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    let parsedTarget: URL;
    try {
      parsedTarget = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
    } catch {
      return new Response('Invalid URL: ' + targetUrl, { status: 400, headers: corsHeaders });
    }

    const hostname = parsedTarget.hostname.toLowerCase();
    console.log('[proxy] Fetching:', parsedTarget.href);

    const isAllowed = ALLOWED_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith(`.${domain}`)
    );

    if (!isAllowed) {
      console.log(`[proxy] Domain not allowed: ${hostname}`);
      return new Response(
        `Domain ${hostname} not whitelisted.`, 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'text/plain' } }
      );
    }

    console.log(`[proxy] Fetching: ${parsedTarget.href}`);
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(parsedTarget.href, {
      headers: {
        'User-Agent': 'EldoriaAI-ResearchBot/1.0 (+https://eldoria.ai/bot)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);
    console.log(`[proxy] Response status: ${response.status}`);

    const contentType = response.headers.get('Content-Type') || '';
    if (!contentType.includes('text/html')) {
      return new Response('Only HTML content can be proxied', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    let html = await response.text();

    html = transformHTML(html, parsedTarget.href);

    const responseHeaders = new Headers(corsHeaders);
    responseHeaders.set('Content-Type', 'text/html; charset=utf-8');
    responseHeaders.set('X-Proxied-By', 'Eldoria-Neural-Bridge/2.0');
    responseHeaders.set('X-Frame-Options', 'ALLOWALL');
    responseHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    responseHeaders.set('Pragma', 'no-cache');
    responseHeaders.set('Expires', '0');

    return new Response(html, {
      status: 200,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('[proxy] Error:', error);
    
    return new Response(
      createErrorPage(error instanceof Error ? error.message : 'Unknown error'),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' }
      }
    );
  }
};

export const config = {
  path: "/api/*",
  cache: "off",
};
