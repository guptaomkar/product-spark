import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnrichmentRequest {
  mfr: string;
  mpn: string;
  attributes: string[];
}

interface EnrichmentResponse {
  success: boolean;
  data?: Record<string, string>;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mfr, mpn, attributes } = await req.json() as EnrichmentRequest;
    
    console.log(`[enrich-product] Processing: ${mfr} ${mpn}`);
    console.log(`[enrich-product] Attributes requested: ${attributes.join(', ')}`);

    const username = Deno.env.get('OXYLABS_USERNAME');
    const password = Deno.env.get('OXYLABS_PASSWORD');

    if (!username || !password) {
      console.error('[enrich-product] Missing Oxylabs credentials');
      return new Response(
        JSON.stringify({ success: false, error: 'Oxylabs credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the query for Oxylabs AI mode
    const attributeList = attributes.join(', ');
    const query = `provide list of attributes for ${mfr} ${mpn}\nattribute list: ${attributeList}`;

    console.log(`[enrich-product] Query: ${query}`);

    const payload = {
      source: "google_ai_mode",
      query: query,
      geo_location: "California,United States",
      parse: true,
      render: "html"
    };

    const authHeader = btoa(`${username}:${password}`);
    
    const response = await fetch('https://realtime.oxylabs.io/v1/queries', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[enrich-product] Oxylabs API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ success: false, error: `Oxylabs API error: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log(`[enrich-product] Oxylabs response received`);

    // Extract response_text from Oxylabs response
    const responseText = extractResponseText(data);
    console.log(`[enrich-product] Extracted response: ${responseText.substring(0, 200)}...`);

    // Parse the response to extract attribute values
    const enrichedData = parseAttributeValues(responseText, attributes);
    console.log(`[enrich-product] Parsed attributes:`, enrichedData);

    return new Response(
      JSON.stringify({ success: true, data: enrichedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[enrich-product] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractResponseText(data: any): string {
  try {
    const resultsList = data.results || [];
    if (resultsList.length > 0) {
      const content = resultsList[0].content || {};
      const responseText = content.response_text || "No response text found.";
      return responseText;
    }
    return "No results returned from API.";
  } catch (e) {
    return `Parsing Error: ${String(e)}`;
  }
}

function parseAttributeValues(responseText: string, attributes: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  
  // Try to parse as JSON first
  try {
    // Look for JSON in the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Map parsed values to our attributes
      for (const attr of attributes) {
        const lowerAttr = attr.toLowerCase().replace(/\s+/g, '_');
        // Check various possible key formats
        for (const [key, value] of Object.entries(parsed)) {
          const lowerKey = key.toLowerCase().replace(/\s+/g, '_');
          if (lowerKey === lowerAttr || lowerKey.includes(lowerAttr) || lowerAttr.includes(lowerKey)) {
            result[attr] = String(value);
            break;
          }
        }
      }
      // If we got some results from JSON, return them
      if (Object.keys(result).length > 0) {
        return result;
      }
    }
  } catch {
    // JSON parsing failed, try text extraction
  }

  // Text-based extraction
  for (const attr of attributes) {
    // Look for patterns like "Attribute: Value" or "Attribute - Value" or "Attribute = Value"
    const patterns = [
      new RegExp(`${escapeRegex(attr)}[:\\-=]\\s*([^\\n,;]+)`, 'i'),
      new RegExp(`${escapeRegex(attr)}\\s*[:\\-=]?\\s*"([^"]+)"`, 'i'),
      new RegExp(`"${escapeRegex(attr)}"[:\\s]*"([^"]+)"`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = responseText.match(pattern);
      if (match && match[1]) {
        result[attr] = match[1].trim();
        break;
      }
    }
  }

  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
