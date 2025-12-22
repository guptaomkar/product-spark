import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { DOMParser, Element } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SelectorMapping {
  id: string;
  xpath: string;
  cssSelector: string;
  columnName: string;
  type: 'image' | 'link' | 'text' | 'datasheet';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, selectors } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!selectors || !Array.isArray(selectors) || selectors.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Selectors are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Scraping URL: ${url} with ${selectors.length} selectors`);

    // Fetch the page
    const pageResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!pageResponse.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to fetch page: ${pageResponse.status} ${pageResponse.statusText}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await pageResponse.text();
    console.log(`Fetched ${html.length} bytes of HTML`);

    // Parse HTML
    const doc = new DOMParser().parseFromString(html, 'text/html');
    if (!doc) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse HTML' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const extractedData: Record<string, string> = {};
    const errors: string[] = [];

    // Process each selector
    for (const selector of selectors as SelectorMapping[]) {
      try {
        let element: Element | null = null;

        // Try CSS selector first
        if (selector.cssSelector) {
          element = doc.querySelector(selector.cssSelector) as Element | null;
        }

        if (!element) {
          console.log(`No element found for selector: ${selector.cssSelector || selector.xpath}`);
          extractedData[selector.columnName] = '';
          continue;
        }

        // Extract value based on type
        let value = '';

        switch (selector.type) {
          case 'image':
            value = element.getAttribute('src') || 
                   element.getAttribute('data-src') || 
                   element.getAttribute('data-lazy-src') || '';
            break;

          case 'link':
          case 'datasheet':
            value = element.getAttribute('href') || '';
            break;

          case 'text':
          default:
            value = element.textContent?.trim() || '';
            break;
        }

        // Make relative URLs absolute
        if ((selector.type === 'image' || selector.type === 'link' || selector.type === 'datasheet') && value && !value.startsWith('http')) {
          try {
            const baseUrl = new URL(url);
            value = new URL(value, baseUrl.origin).href;
          } catch {
            // Keep the relative URL if we can't make it absolute
          }
        }

        extractedData[selector.columnName] = value;
        console.log(`Extracted ${selector.columnName}: ${value.substring(0, 100)}...`);

      } catch (selectorError) {
        console.error(`Error processing selector ${selector.columnName}:`, selectorError);
        errors.push(`${selector.columnName}: ${selectorError instanceof Error ? selectorError.message : 'Unknown error'}`);
        extractedData[selector.columnName] = '';
      }
    }

    const filledCount = Object.values(extractedData).filter(v => v.length > 0).length;
    const success = filledCount > 0;

    console.log(`Extraction complete: ${filledCount}/${selectors.length} values found`);

    return new Response(
      JSON.stringify({
        success,
        extractedData,
        errors: errors.length > 0 ? errors : undefined,
        stats: {
          total: selectors.length,
          filled: filledCount,
          empty: selectors.length - filledCount,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in scrape-assets function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
