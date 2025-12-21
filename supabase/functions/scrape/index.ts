// This is a Deno module for a Supabase Edge Function.
// It securely fetches the content of a URL provided by the client.
// This version is dependency-free for maximum stability.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

// FIX: Declare Deno global to address TypeScript error "Cannot find name 'Deno'".
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple HTML to text conversion function
function htmlToText(html: string): string {
  // 1. Remove script and style elements
  let text = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/(script|style)>/gim, '');
  // 2. Remove all other HTML tags
  text = text.replace(/<[^>]*>/g, ' ');
  // 3. Decode common HTML entities
  text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  // 4. Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("Scrape function started (v2 - dependency-free).");
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      console.error("Validation failed: URL is missing or not a string.");
      throw new Error('URL is a required parameter.');
    }
    console.log(`Step 1: Received request for URL: ${url}`);

    let response;
    try {
      console.log("Step 2: Attempting to fetch URL content...");
      response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
      });
      console.log(`Step 3: Fetch completed with status: ${response.status}`);
    } catch (fetchError) {
      console.error("CRITICAL: Fetch operation failed.", fetchError);
      throw new Error(`Network error while trying to fetch URL. Reason: ${fetchError.message}`);
    }

    if (!response.ok) {
      console.error(`Fetch failed with status: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const htmlContent = await response.text();
    console.log("Step 4: Successfully retrieved HTML content.");
    
    const textContent = htmlToText(htmlContent);
    console.log("Step 5: Successfully extracted text from HTML.");
    
    const MAX_CONTENT_LENGTH = 20000;
    const finalContent = textContent.substring(0, MAX_CONTENT_LENGTH);
    console.log(`Step 6: Content truncated to ${finalContent.length} characters.`);

    return new Response(JSON.stringify({ content: finalContent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("FATAL: An error occurred in the scrape function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
