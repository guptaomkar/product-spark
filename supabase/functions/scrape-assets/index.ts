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

// Convert XPath to CSS selector - handles common patterns
function xpathToCSS(xpath: string): string | null {
  if (!xpath || !xpath.trim()) return null;
  
  console.log(`Converting XPath: ${xpath}`);
  
  let css = xpath.trim();
  
  // Remove leading slashes and wildcards
  css = css.replace(/^\/+\*?\/?/, '');
  css = css.replace(/^\/\//, '');
  
  // Handle [@id='value'] or [@id="value"]
  css = css.replace(/\[@id=['"]([^'"]+)['"]\]/g, '#$1');
  
  // Handle [@class='value'] -> .value (replace spaces with dots)
  css = css.replace(/\[@class=['"]([^'"]+)['"]\]/g, (_, classes) => {
    return '.' + classes.trim().split(/\s+/).join('.');
  });
  
  // Handle [contains(@class, 'value')]
  css = css.replace(/\[contains\s*\(\s*@class\s*,\s*['"]([^'"]+)['"]\s*\)\]/g, '.$1');
  
  // Handle other attribute selectors [@attr='value']
  css = css.replace(/\[@([^=\]]+)=['"]([^'"]+)['"]\]/g, '[$1="$2"]');
  
  // Handle position [1] -> :nth-of-type(1)
  css = css.replace(/\[(\d+)\]/g, ':nth-of-type($1)');
  
  // Handle [last()]
  css = css.replace(/\[last\(\)\]/g, ':last-of-type');
  
  // Handle [first()]
  css = css.replace(/\[first\(\)\]/g, ':first-of-type');
  
  // Replace // with space (descendant)
  css = css.replace(/\/\//g, ' ');
  
  // Replace / with > (direct child)
  css = css.replace(/\//g, ' > ');
  
  // Clean up multiple spaces
  css = css.replace(/\s+/g, ' ').trim();
  
  // Clean up > with spaces
  css = css.replace(/\s*>\s*/g, ' > ');
  
  // Remove leading >
  css = css.replace(/^\s*>\s*/, '');
  
  console.log(`Converted to CSS: ${css}`);
  
  // If still contains XPath-specific chars, it's not convertible
  if (css.includes('@') || css.includes('()') || css.includes('::')) {
    console.log('XPath too complex to convert');
    return null;
  }
  
  return css || null;
}

// Try to find element with CSS selector or converted XPath
function findElement(doc: ReturnType<DOMParser['parseFromString']>, selector: SelectorMapping): Element | null {
  // Try CSS selector first
  if (selector.cssSelector && selector.cssSelector.trim()) {
    try {
      const el = doc?.querySelector(selector.cssSelector.trim());
      if (el) {
        console.log(`Found with CSS: ${selector.cssSelector}`);
        return el as Element;
      }
      console.log(`CSS selector not found: ${selector.cssSelector}`);
    } catch (e) {
      console.log(`CSS error: ${e}`);
    }
  }
  
  // Try XPath by converting to CSS
  if (selector.xpath && selector.xpath.trim()) {
    const converted = xpathToCSS(selector.xpath);
    if (converted) {
      try {
        const el = doc?.querySelector(converted);
        if (el) {
          console.log(`Found with converted XPath: ${converted}`);
          return el as Element;
        }
        console.log(`Converted selector not found: ${converted}`);
      } catch (e) {
        console.log(`Converted CSS error: ${e}`);
      }
    }
  }
  
  return null;
}

// Extract value based on element type
function extractValue(element: Element, type: string, baseUrl: string): string {
  let value = '';
  
  switch (type) {
    case 'image':
      value = element.getAttribute('src') || 
              element.getAttribute('data-src') || 
              element.getAttribute('data-lazy-src') ||
              element.getAttribute('data-original') || '';
      
      // Try srcset
      if (!value) {
        const srcset = element.getAttribute('srcset');
        if (srcset) {
          value = srcset.split(',')[0]?.trim().split(' ')[0] || '';
        }
      }
      
      // Look for img inside if element isn't img
      if (!value && element.tagName?.toLowerCase() !== 'img') {
        const img = element.querySelector('img');
        if (img) {
          value = img.getAttribute('src') || img.getAttribute('data-src') || '';
        }
      }
      break;
      
    case 'link':
    case 'datasheet':
      value = element.getAttribute('href') || '';
      if (!value && element.tagName?.toLowerCase() !== 'a') {
        const a = element.querySelector('a');
        if (a) value = a.getAttribute('href') || '';
      }
      break;
      
    case 'text':
    default:
      value = element.textContent?.trim() || '';
      break;
  }
  
  // Make relative URLs absolute
  if (value && (type === 'image' || type === 'link' || type === 'datasheet')) {
    if (value.startsWith('//')) {
      value = 'https:' + value;
    } else if (value.startsWith('/')) {
      try {
        const url = new URL(baseUrl);
        value = url.origin + value;
      } catch { /* keep as is */ }
    } else if (!value.startsWith('http') && !value.startsWith('data:')) {
      try {
        value = new URL(value, baseUrl).href;
      } catch { /* keep as is */ }
    }
  }
  
  return value;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, selectors } = await req.json();

    console.log('=== SCRAPE REQUEST ===');
    console.log('URL:', url);
    console.log('Selectors:', JSON.stringify(selectors, null, 2));

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

    // Fetch page
    const pageResponse = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    if (!pageResponse.ok) {
      console.error(`Fetch failed: ${pageResponse.status}`);
      return new Response(
        JSON.stringify({ success: false, error: `HTTP ${pageResponse.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await pageResponse.text();
    console.log(`HTML length: ${html.length}`);

    const doc = new DOMParser().parseFromString(html, 'text/html');
    if (!doc) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse HTML' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const extractedData: Record<string, string> = {};
    const errors: string[] = [];

    for (const selector of selectors as SelectorMapping[]) {
      console.log(`\n--- ${selector.columnName} ---`);
      console.log(`CSS: ${selector.cssSelector || '(none)'}`);
      console.log(`XPath: ${selector.xpath || '(none)'}`);
      console.log(`Type: ${selector.type}`);
      
      try {
        const element = findElement(doc, selector);
        
        if (element) {
          const value = extractValue(element, selector.type, url);
          extractedData[selector.columnName] = value;
          console.log(`Extracted: ${value.substring(0, 100)}`);
        } else {
          extractedData[selector.columnName] = '';
          errors.push(`${selector.columnName}: Element not found`);
          console.log('Element not found');
        }
      } catch (e) {
        console.error(`Error: ${e}`);
        extractedData[selector.columnName] = '';
        errors.push(`${selector.columnName}: ${e}`);
      }
    }

    const filled = Object.values(extractedData).filter(v => v.length > 0).length;
    
    console.log('\n=== RESULT ===');
    console.log(`Filled: ${filled}/${selectors.length}`);
    console.log('Data:', JSON.stringify(extractedData, null, 2));

    return new Response(
      JSON.stringify({
        success: filled > 0,
        extractedData,
        errors: errors.length > 0 ? errors : undefined,
        stats: { total: selectors.length, filled, empty: selectors.length - filled },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
