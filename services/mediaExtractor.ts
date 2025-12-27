/**
 * MediaExtractor - Extract images and tables from web pages
 * Phase 44.2: Enhanced Research Pipeline
 */

import { ExtractedImage, ExtractedTable } from './researchService';
import { getBridgeUrl } from './bridgeClient';

// ============ IMAGE EXTRACTION ============

/**
 * Extract images from a URL via Python bridge
 */
export async function extractImagesFromUrl(url: string): Promise<ExtractedImage[]> {
    try {
        // Use the Python bridge for HTML parsing (BeautifulSoup)
        const bridgeUrl = await getBridgeUrl();

        const response = await fetch(`${bridgeUrl}/research/extract-media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, type: 'images' })
        });

        if (!response.ok) {
            console.warn('[MediaExtractor] Bridge extraction failed, trying client-side');
            return await extractImagesClientSide(url);
        }

        const data = await response.json();
        return data.images || [];
    } catch (error) {
        console.warn('[MediaExtractor] Falling back to client-side extraction');
        return await extractImagesClientSide(url);
    }
}

/**
 * Client-side image extraction (CORS-friendly URLs only)
 */
async function extractImagesClientSide(url: string): Promise<ExtractedImage[]> {
    try {
        // For CORS-restricted pages, we can't fetch directly
        // Return empty and let user know to use "View Source" method
        console.log('[MediaExtractor] Client-side extraction for:', url);

        // Try proxied fetch (works for some open access pages)
        const corsProxy = 'https://api.allorigins.win/raw?url=';
        const response = await fetch(corsProxy + encodeURIComponent(url));

        if (!response.ok) {
            return [];
        }

        const html = await response.text();
        return parseImagesFromHtml(html, url);
    } catch (error) {
        console.error('[MediaExtractor] Client extraction failed:', error);
        return [];
    }
}

/**
 * Parse images from HTML string
 */
function parseImagesFromHtml(html: string, baseUrl: string): ExtractedImage[] {
    const images: ExtractedImage[] = [];
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/gi;

    let match;
    while ((match = imgRegex.exec(html)) !== null) {
        let src = match[1];
        const alt = match[2] || '';

        // Skip tiny images (likely icons), data URIs, and tracking pixels
        if (src.includes('data:image/gif') ||
            src.includes('1x1') ||
            src.includes('pixel') ||
            src.includes('tracking')) {
            continue;
        }

        // Resolve relative URLs
        if (src.startsWith('/')) {
            const urlObj = new URL(baseUrl);
            src = `${urlObj.origin}${src}`;
        } else if (!src.startsWith('http')) {
            src = new URL(src, baseUrl).href;
        }

        // Look for figure captions nearby
        const captionMatch = html.match(new RegExp(`${escapeRegex(src)}[^<]*<figcaption[^>]*>([^<]+)</figcaption>`, 'i'));
        const caption = captionMatch ? captionMatch[1].trim() : undefined;

        images.push({ src, alt, caption });
    }

    // Deduplicate by src
    const seen = new Set<string>();
    return images.filter(img => {
        if (seen.has(img.src)) return false;
        seen.add(img.src);
        return true;
    }).slice(0, 20); // Limit to 20 images
}

// ============ TABLE EXTRACTION ============

/**
 * Extract tables from a URL via Python bridge
 */
export async function extractTablesFromUrl(url: string): Promise<ExtractedTable[]> {
    try {
        const bridgeUrl = await getBridgeUrl();

        const response = await fetch(`${bridgeUrl}/research/extract-media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, type: 'tables' })
        });

        if (!response.ok) {
            console.warn('[MediaExtractor] Bridge table extraction failed, trying client-side');
            return await extractTablesClientSide(url);
        }

        const data = await response.json();
        return data.tables || [];
    } catch (error) {
        console.warn('[MediaExtractor] Falling back to client-side table extraction');
        return await extractTablesClientSide(url);
    }
}

/**
 * Client-side table extraction
 */
async function extractTablesClientSide(url: string): Promise<ExtractedTable[]> {
    try {
        const corsProxy = 'https://api.allorigins.win/raw?url=';
        const response = await fetch(corsProxy + encodeURIComponent(url));

        if (!response.ok) {
            return [];
        }

        const html = await response.text();
        return parseTablesFromHtml(html);
    } catch (error) {
        console.error('[MediaExtractor] Client table extraction failed:', error);
        return [];
    }
}

/**
 * Parse tables from HTML string
 */
function parseTablesFromHtml(html: string): ExtractedTable[] {
    const tables: ExtractedTable[] = [];

    // Simple regex-based table extraction
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;

    let tableMatch;
    while ((tableMatch = tableRegex.exec(html)) !== null) {
        const tableHtml = tableMatch[1];

        // Extract headers
        const headers: string[] = [];
        const thRegex = /<th[^>]*>([\s\S]*?)<\/th>/gi;
        let thMatch;
        while ((thMatch = thRegex.exec(tableHtml)) !== null) {
            headers.push(stripHtml(thMatch[1]).trim());
        }

        // Extract rows
        const rows: string[][] = [];
        const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let trMatch;
        while ((trMatch = trRegex.exec(tableHtml)) !== null) {
            const rowHtml = trMatch[1];
            const cells: string[] = [];

            const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
            let tdMatch;
            while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
                cells.push(stripHtml(tdMatch[1]).trim());
            }

            if (cells.length > 0) {
                rows.push(cells);
            }
        }

        // Only include tables with actual content
        if ((headers.length > 0 || rows.length > 0) && rows.length > 0) {
            // If no headers, use first row as headers
            if (headers.length === 0 && rows.length > 1) {
                headers.push(...rows.shift()!);
            }

            tables.push({ headers, rows });
        }
    }

    return tables.slice(0, 10); // Limit to 10 tables
}

// ============ UTILITIES ============

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
}

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============ COMBINED EXTRACTION ============

export interface ExtractedMedia {
    images: ExtractedImage[];
    tables: ExtractedTable[];
    url: string;
    extractedAt: string;
}

/**
 * Extract all media (images + tables) from a URL
 */
export async function extractMediaFromUrl(url: string): Promise<ExtractedMedia> {
    console.log('[MediaExtractor] Extracting media from:', url);

    const [images, tables] = await Promise.all([
        extractImagesFromUrl(url),
        extractTablesFromUrl(url)
    ]);

    return {
        images,
        tables,
        url,
        extractedAt: new Date().toISOString()
    };
}

// ============ EXPORT ============

export const MediaExtractor = {
    extractImagesFromUrl,
    extractTablesFromUrl,
    extractMediaFromUrl
};

export default MediaExtractor;
