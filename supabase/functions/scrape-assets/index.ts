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

    console.log('=== SCRAPE-ASSETS REQUEST ===');
    console.log('URL:', url);
    console.log('Selectors received:', JSON.stringify(selectors, null, 2));

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
      console.error(`Failed to fetch page: ${pageResponse.status} ${pageResponse.statusText}`);
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
    
    // Log first 500 chars of HTML for debugging
    console.log('HTML preview:', html.substring(0, 500));

    // Parse HTML
    const doc = new DOMParser().parseFromString(html, 'text/html');
    if (!doc) {
      console.error('Failed to parse HTML document');
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse HTML' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const extractedData: Record<string, string> = {};
    const errors: string[] = [];

    // Process each selector
    for (const selector of selectors as SelectorMapping[]) {
      console.log(`\n--- Processing selector: ${selector.columnName} ---`);
      console.log('Type:', selector.type);
      console.log('CSS Selector:', selector.cssSelector);
      console.log('XPath:', selector.xpath);
      
      try {
        let element: Element | null = null;
        let selectorUsed = '';

        // Try CSS selector first (preferred)
        if (selector.cssSelector && selector.cssSelector.trim()) {
          const cssSelector = selector.cssSelector.trim();
          console.log(`Trying CSS selector: "${cssSelector}"`);
          
          try {
            element = doc.querySelector(cssSelector) as Element | null;
            selectorUsed = `CSS: ${cssSelector}`;
            console.log(`CSS querySelector result: ${element ? 'FOUND' : 'NOT FOUND'}`);
          } catch (cssError) {
            console.error(`CSS selector error: ${cssError}`);
          }
        }

        // If no element found and we have xpath, try to convert common patterns
        if (!element && selector.xpath && selector.xpath.trim()) {
          console.log(`CSS selector failed, XPath provided: "${selector.xpath}"`);
          console.log('Note: deno_dom does not support XPath. Please use CSS selectors.');
          
          // Try to convert simple XPath to CSS selector
          const convertedSelector = xpathToCss(selector.xpath);
          if (convertedSelector) {
            console.log(`Converted XPath to CSS: "${convertedSelector}"`);
            try {
              element = doc.querySelector(convertedSelector) as Element | null;
              selectorUsed = `Converted XPath->CSS: ${convertedSelector}`;
              console.log(`Converted selector result: ${element ? 'FOUND' : 'NOT FOUND'}`);
            } catch (e) {
              console.error(`Converted selector error: ${e}`);
            }
          }
        }

        if (!element) {
          console.log(`No element found for: ${selector.columnName}`);
          errors.push(`${selector.columnName}: No element found with selector`);
          extractedData[selector.columnName] = '';
          continue;
        }

        console.log(`Element found using ${selectorUsed}`);
        console.log(`Element tag: ${element.tagName}`);

        // Extract value based on type
        let value = '';

        switch (selector.type) {
          case 'image':
            // Try multiple image source attributes
            value = element.getAttribute('src') || 
                   element.getAttribute('data-src') || 
                   element.getAttribute('data-lazy-src') ||
                   element.getAttribute('data-original') ||
                   element.getAttribute('srcset')?.split(',')[0]?.trim().split(' ')[0] || '';
            console.log(`Image attributes - src: ${element.getAttribute('src')}, data-src: ${element.getAttribute('data-src')}`);
            break;

          case 'link':
          case 'datasheet':
            value = element.getAttribute('href') || '';
            console.log(`Link href: ${value}`);
            break;

          case 'text':
          default:
            value = element.textContent?.trim() || '';
            console.log(`Text content: ${value.substring(0, 100)}`);
            break;
        }

        // Make relative URLs absolute
        if ((selector.type === 'image' || selector.type === 'link' || selector.type === 'datasheet') && value && !value.startsWith('http') && !value.startsWith('data:')) {
          try {
            const baseUrl = new URL(url);
            const absoluteUrl = new URL(value, baseUrl.origin).href;
            console.log(`Converted relative URL "${value}" to absolute: "${absoluteUrl}"`);
            value = absoluteUrl;
          } catch (urlError) {
            console.error(`URL conversion error: ${urlError}`);
          }
        }

        extractedData[selector.columnName] = value;
        console.log(`✓ Extracted ${selector.columnName}: ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}`);

      } catch (selectorError) {
        console.error(`Error processing selector ${selector.columnName}:`, selectorError);
        errors.push(`${selector.columnName}: ${selectorError instanceof Error ? selectorError.message : 'Unknown error'}`);
        extractedData[selector.columnName] = '';
      }
    }

    const filledCount = Object.values(extractedData).filter(v => v.length > 0).length;
    const success = filledCount > 0;

    console.log('\n=== EXTRACTION SUMMARY ===');
    console.log(`Total selectors: ${selectors.length}`);
    console.log(`Filled: ${filledCount}`);
    console.log(`Empty: ${selectors.length - filledCount}`);
    console.log('Extracted data:', JSON.stringify(extractedData, null, 2));
    if (errors.length > 0) {
      console.log('Errors:', errors);
    }

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

// Helper function to convert simple XPath expressions to CSS selectors
function xpathToCss(xpath: string): string | null {
  console.log(`Attempting to convert XPath: ${xpath}`);
  
  // Remove leading //* or //
  let css = xpath.replace(/^\/\/\*?\/?/, '');
  
  // Handle ID selectors: [@id="value"]
  css = css.replace(/\[@id="([^"]+)"\]/g, '#$1');
  css = css.replace(/\[@id='([^']+)'\]/g, '#$1');
  
  // Handle class selectors: [@class="value"]
  css = css.replace(/\[@class="([^"]+)"\]/g, '.$1');
  css = css.replace(/\[@class='([^']+)'\]/g, '.$1');
  
  // Handle contains class: [contains(@class, "value")]
  css = css.replace(/\[contains\(@class,\s*["']([^"']+)["']\)\]/g, '.$1');
  
  // Handle position: [1] -> :first-child, [last()] -> :last-child
  css = css.replace(/\[1\]/g, ':first-child');
  css = css.replace(/\[last\(\)\]/g, ':last-child');
  
  // Handle other positions [n] -> :nth-child(n)
  css = css.replace(/\[(\d+)\]/g, ':nth-child($1)');
  
  // Replace / with > for direct children
  css = css.replace(/\//g, ' > ');
  
  // Clean up spaces
  css = css.replace(/\s+/g, ' ').trim();
  
  // Remove leading >
  css = css.replace(/^\s*>\s*/, '');
  
  console.log(`Converted result: ${css}`);
  
  // Validate - if it still contains XPath-specific syntax, return null
  if (css.includes('@') || css.includes('(') || css.includes('[')) {
    console.log('Conversion incomplete - still contains XPath syntax');
    return null;
  }
  
  return css || null;
}
