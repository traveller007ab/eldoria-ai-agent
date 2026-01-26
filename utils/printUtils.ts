/**
 * Print Utilities
 * Centralized print/export logic for the workspace
 */

export const PRINT_STYLES = `
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600&family=IBM+Plex+Mono&display=swap');
    body { 
        font-family: 'IBM Plex Sans', sans-serif; 
        line-height: 1.7; 
        color: #1a202c; 
        max-width: 850px; 
        margin: 50px auto; 
        padding: 0 50px;
        background: white;
    }
    .header { 
        text-align: left; 
        margin-bottom: 40px; 
        border-bottom: 2px solid #06b6d4; 
        padding-bottom: 20px; 
        display: flex; 
        justify-content: space-between; 
        align-items: flex-end; 
    }
    .header h1 { margin: 0; font-size: 26px; color: #0e7490; font-weight: 600; letter-spacing: -0.01em; }
    .header .meta { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; }
    
    #content { font-size: 15px; color: #334155; }
    h1 { font-size: 24px; color: #0f172a; margin-top: 1.5em; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
    h2 { font-size: 20px; color: #1e293b; margin-top: 1.5em; }
    h3 { font-size: 17px; color: #334155; margin-top: 1.25em; text-transform: uppercase; letter-spacing: 0.05em; border-left: 3px solid #06b6d4; padding-left: 12px; }
    
    p { margin-bottom: 1.5em; text-align: justify; }
    ul, ol { margin-bottom: 1.5em; padding-left: 1.75em; }
    li { margin-bottom: 0.75em; }
    
    pre { 
        background: #f8fafc; 
        padding: 20px; 
        border-radius: 10px; 
        font-family: 'IBM Plex Mono', monospace;
        font-size: 13px; 
        overflow-x: auto; 
        border: 1px solid #e2e8f0; 
        margin: 2em 0;
        color: #475569;
    }
    code { background: #f1f5f9; padding: 0.2em 0.4em; border-radius: 4px; font-size: 0.9em; font-family: 'IBM Plex Mono', monospace; }
    
    blockquote { border-left: 4px solid #06b6d4; padding: 15px 25px; font-style: italic; color: #475569; margin: 2em 0; background: #f0f9ff; border-radius: 0 10px 10px 0; }
    
    table { border-collapse: collapse; width: 100%; margin: 2.5em 0; font-size: 13px; }
    th, td { border: 1px solid #e2e8f0; padding: 14px; text-align: left; }
    th { background: #f8fafc; font-weight: 700; color: #1e293b; text-transform: uppercase; font-size: 11px; }
    
    .footer { text-align: center; margin-top: 80px; font-size: 10px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 25px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.15em; }
    
    @media print {
        body { margin: 0; padding: 15mm; }
        .no-print { display: none; }
        h1, h2 { page-break-after: avoid; }
    }
`;

/**
 * Sanitize AI output content for printing
 * Removes common AI preamble patterns
 */
export function sanitizeContentForPrint(content: string): string {
    let sanitized = content.trim();

    // Aggressive preamble removal
    const preambleRegex = /^([\s\*\-_>]*)(To perform|I will|Sure|I'll|Certainly|Here is|Then, I'll proceed|In order to|Okay|I've|I can|I've noticed|First|I will first|Secondly|Let me)[\s\S]+?(\.|:|\n)/gim;

    let lastContent = "";
    while (sanitized !== lastContent) {
        lastContent = sanitized;
        const match = sanitized.match(preambleRegex);
        if (match) {
            sanitized = sanitized.replace(preambleRegex, '').trim();
        }
    }

    // Clean up SAF_ISO tags
    sanitized = sanitized.replace(/```json\n<SAF_ISO>/g, '```json');
    sanitized = sanitized.replace(/<\/SAF_ISO>\n```/g, '```');
    sanitized = sanitized.replace(/<SAF_ISO>/g, '\n\n### Technical Specification (SAF-ISO)\n```json\n');
    sanitized = sanitized.replace(/<\/SAF_ISO>/g, '\n```\n');

    // Normalize headers
    if (!sanitized.includes('# ')) {
        sanitized = sanitized.replace(/^### /gm, '## ');
    }

    return sanitized;
}

/**
 * Generate print HTML document
 */
export function generatePrintDocument(title: string, content: string, canvasId: string): string {
    const sanitized = sanitizeContentForPrint(content);
    const date = new Date().toLocaleDateString(undefined, { dateStyle: 'long' });

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Eldoria Hub - Strategic Brief</title>
            <style>${PRINT_STYLES}</style>
        </head>
        <body>
            <div class="header">
                <div>
                    <div class="meta">Eldoria Strategic Analysis</div>
                    <h1>${title || "STRATEGIC BRIEF"}</h1>
                </div>
                <div style="text-align: right;">
                    <div class="meta">Timestamp</div>
                    <div style="font-size: 12px; color: #475569;">${date}</div>
                </div>
            </div>
            <div id="content"></div>
            <div class="footer">
                Generated via Eldoria AI IDE &bull; Neural Context Layer v1.2 &bull; Project ID: ${canvasId}
            </div>
            <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
            <script>
                const rawContent = ${JSON.stringify(sanitized)};
                document.getElementById('content').innerHTML = marked.parse(rawContent);
                window.onload = () => {
                    setTimeout(() => { window.print(); }, 1200); 
                };
            </script>
        </body>
        </html>
    `;
}
