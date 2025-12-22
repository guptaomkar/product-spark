import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnrichmentRequest {
  mfr: string;
  mpn: string;
  attributes: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mfr, mpn, attributes } = (await req.json()) as EnrichmentRequest;

    console.log(`[enrich-product] Processing: ${mfr} ${mpn}`);
    console.log(`[enrich-product] Total attributes: ${attributes.length}`);

    const username = Deno.env.get("OXYLABS_USERNAME");
    const password = Deno.env.get("OXYLABS_PASSWORD");

    if (!username || !password) {
      console.error("[enrich-product] Missing Oxylabs credentials");
      return new Response(JSON.stringify({ success: false, error: "Oxylabs credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = btoa(`${username}:${password}`);
    const allResults: Record<string, string> = {};
    
    // Initialize all attributes
    for (const attr of attributes) {
      allResults[attr] = "";
    }

    // Split attributes into batches that fit within 400 char query limit
    // Base query: "JSON specs for MFR MPN: " ~30 chars + attributes
    const baseQueryLength = `JSON specs for ${mfr} ${mpn}: `.length;
    const maxAttrChars = 350 - baseQueryLength; // Leave buffer
    
    const batches: string[][] = [];
    let currentBatch: string[] = [];
    let currentLength = 0;

    for (const attr of attributes) {
      const attrWithComma = currentBatch.length > 0 ? `, ${attr}` : attr;
      if (currentLength + attrWithComma.length > maxAttrChars) {
        if (currentBatch.length > 0) {
          batches.push(currentBatch);
        }
        currentBatch = [attr];
        currentLength = attr.length;
      } else {
        currentBatch.push(attr);
        currentLength += attrWithComma.length;
      }
    }
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    console.log(`[enrich-product] Split into ${batches.length} batches`);

    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const query = `JSON specs for ${mfr} ${mpn}: ${batch.join(", ")}`;
      
      console.log(`[enrich-product] Batch ${i + 1}/${batches.length}, query length: ${query.length}`);

      const payload = {
        source: "google_ai_mode",
        query: query,
        geo_location: "United States",
        parse: true,
        render: "html",
      };

      try {
        const response = await fetch("https://realtime.oxylabs.io/v1/queries", {
          method: "POST",
          headers: {
            Authorization: `Basic ${authHeader}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[enrich-product] Batch ${i + 1} error: ${response.status} - ${errorText}`);
          continue; // Skip this batch but continue with others
        }

        const data = await response.json();
        const responseText = extractResponseText(data);
        console.log(`[enrich-product] Batch ${i + 1} response: ${responseText.substring(0, 300)}...`);

        // Parse and merge results
        const batchResults = parseAttributeValues(responseText, batch);
        for (const [key, value] of Object.entries(batchResults)) {
          if (value && value !== "") {
            allResults[key] = value;
          }
        }
      } catch (batchError) {
        console.error(`[enrich-product] Batch ${i + 1} failed:`, batchError);
      }

      // Small delay between batches to avoid rate limiting
      if (i < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`[enrich-product] Final results:`, JSON.stringify(allResults, null, 2));

    return new Response(JSON.stringify({ success: true, data: allResults }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[enrich-product] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function extractResponseText(data: any): string {
  try {
    const resultsList = data.results || [];
    if (resultsList.length > 0) {
      const content = resultsList[0].content || {};
      return content.response_text || "No response text found.";
    }
    return "No results returned from API.";
  } catch (e) {
    return `Parsing Error: ${String(e)}`;
  }
}

function parseAttributeValues(responseText: string, attributes: string[]): Record<string, string> {
  const result: Record<string, string> = {};

  for (const attr of attributes) {
    result[attr] = "";
  }

  // Try JSON parsing first
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Check "attributes" structure
      if (parsed.attributes && typeof parsed.attributes === "object") {
        for (const attr of attributes) {
          if (parsed.attributes[attr] !== undefined && parsed.attributes[attr] !== "") {
            result[attr] = String(parsed.attributes[attr]);
          }
        }
        return result;
      }

      // Direct key matching with normalization
      for (const attr of attributes) {
        if (parsed[attr] !== undefined && parsed[attr] !== "") {
          result[attr] = String(parsed[attr]);
          continue;
        }

        const normalizedAttr = attr.toLowerCase().replace(/[\s_\-\.]+/g, "");
        for (const [key, value] of Object.entries(parsed)) {
          if (value === null || value === undefined || value === "") continue;
          const normalizedKey = key.toLowerCase().replace(/[\s_\-\.]+/g, "");
          if (normalizedKey === normalizedAttr) {
            result[attr] = String(value);
            break;
          }
        }
      }
    }
  } catch (e) {
    console.log("[enrich-product] JSON parsing failed, trying text extraction");

    // Text-based extraction fallback
    for (const attr of attributes) {
      const escapedAttr = attr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const patterns = [
        new RegExp(`"${escapedAttr}"\\s*:\\s*"([^"]+)"`, "i"),
        new RegExp(`${escapedAttr}\\s*:\\s*([^\\n,;]+)`, "i"),
      ];

      for (const pattern of patterns) {
        const match = responseText.match(pattern);
        if (match && match[1] && match[1].trim()) {
          result[attr] = match[1].trim();
          break;
        }
      }
    }
  }

  return result;
}
