import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// EdgeRuntime is globally available in Supabase Edge Functions
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Product {
  id: string;
  mfr: string;
  mpn: string;
  category: string;
}

interface EnrichmentRequest {
  runId: string;
  concurrency?: number;
}

const DEFAULT_CONCURRENCY = 5;

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

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      if (parsed.attributes && typeof parsed.attributes === "object") {
        for (const attr of attributes) {
          if (parsed.attributes[attr] !== undefined && parsed.attributes[attr] !== "") {
            result[attr] = String(parsed.attributes[attr]);
          }
        }
        return result;
      }

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

// Background processing function - uses run_id from user_enrichment_data
async function processEnrichmentRun(runId: string, concurrency: number) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log(`[enrich-batch] Processing run: ${runId}`);

    // Get run details
    const { data: run, error: runError } = await supabase
      .from('user_enrichment_data')
      .select('*')
      .eq('id', runId)
      .single();

    if (runError || !run) {
      console.error('[enrich-batch] Run not found:', runError);
      return;
    }

    if (run.status === 'completed' || run.status === 'cancelled') {
      console.log('[enrich-batch] Run already finished:', run.status);
      return;
    }

    // Mark as processing
    await supabase
      .from('user_enrichment_data')
      .update({ status: 'processing' })
      .eq('id', runId);

    const attributes = run.attributes as { category: string; attributeName: string }[];

    const username = Deno.env.get("OXYLABS_USERNAME");
    const password = Deno.env.get("OXYLABS_PASSWORD");

    if (!username || !password) {
      console.error('[enrich-batch] Oxylabs credentials not configured');
      await supabase
        .from('user_enrichment_data')
        .update({ status: 'failed' })
        .eq('id', runId);
      return;
    }

    const authHeader = btoa(`${username}:${password}`);

    const getAttributesForCategory = (category: string): string[] => {
      return attributes
        .filter(attr => attr.category.toLowerCase() === category.toLowerCase())
        .map(attr => attr.attributeName);
    };

    // Fetch all pending items for this run
    const { data: pendingItems, error: itemsError } = await supabase
      .from('enrichment_run_items')
      .select('*')
      .eq('run_id', runId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (itemsError) {
      console.error('[enrich-batch] Error fetching items:', itemsError);
      await supabase
        .from('user_enrichment_data')
        .update({ status: 'failed' })
        .eq('id', runId);
      return;
    }

    console.log(`[enrich-batch] Processing ${pendingItems?.length || 0} pending items`);

    if (!pendingItems || pendingItems.length === 0) {
      // All items processed, mark run as complete
      await supabase
        .from('user_enrichment_data')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', runId);
      console.log(`[enrich-batch] Run already complete: ${runId}`);
      return;
    }

const enrichProduct = async (item: any): Promise<{ success: boolean; data?: Record<string, string>; error?: string }> => {
      try {
        const categoryAttributes = getAttributesForCategory(item.category || '');
        if (categoryAttributes.length === 0) {
          console.log(`[enrich-batch] No attributes for category: ${item.category}, MPN: ${item.mpn}`);
          return { success: true, data: {} };
        }

        const allResults: Record<string, string> = {};
        for (const attr of categoryAttributes) {
          allResults[attr] = "";
        }

        const baseQueryLength = `JSON specs for ${item.mfr || ''} ${item.mpn || ''}: `.length;
        const maxAttrChars = 350 - baseQueryLength;
        
        const batches: string[][] = [];
        let currentBatch: string[] = [];
        let currentLength = 0;

        for (const attr of categoryAttributes) {
          const attrWithComma = currentBatch.length > 0 ? `, ${attr}` : attr;
          if (currentLength + attrWithComma.length > maxAttrChars) {
            if (currentBatch.length > 0) batches.push(currentBatch);
            currentBatch = [attr];
            currentLength = attr.length;
          } else {
            currentBatch.push(attr);
            currentLength += attrWithComma.length;
          }
        }
        if (currentBatch.length > 0) batches.push(currentBatch);

        console.log(`[enrich-batch] Processing ${item.mpn}: ${batches.length} batches, ${categoryAttributes.length} total attributes`);

        for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
          const batch = batches[batchIdx];
          const query = `JSON specs for ${item.mfr || ''} ${item.mpn || ''}: ${batch.join(", ")}`;

          const payload = {
            source: "google_ai_mode",
            query: query,
            geo_location: "United States",
            parse: true,
            render: "html",
          };

          console.log(`[enrich-batch] Fetching ${item.mpn}, batch ${batchIdx + 1}/${batches.length} with ${batch.length} attrs`);

          const response = await fetch("https://realtime.oxylabs.io/v1/queries", {
            method: "POST",
            headers: {
              Authorization: `Basic ${authHeader}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            const data = await response.json();
            const responseText = extractResponseText(data);
            console.log(`[enrich-batch] ${item.mpn} batch ${batchIdx + 1} response length: ${responseText.length}`);
            const batchResults = parseAttributeValues(responseText, batch);
            for (const [key, value] of Object.entries(batchResults)) {
              if (value && value !== "") {
                allResults[key] = value;
              }
            }
          } else {
            const errorText = await response.text();
            console.error(`[enrich-batch] API error for ${item.mpn} batch ${batchIdx + 1}:`, response.status, errorText);
          }
          
          // Rate limiting delay between batches
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        // Count how many attributes have values
        const filledCount = Object.values(allResults).filter(v => v && v.trim() !== '').length;
        const totalAttrs = categoryAttributes.length;
        const fillRate = totalAttrs > 0 ? (filledCount / totalAttrs) * 100 : 0;
        
        console.log(`[enrich-batch] ${item.mpn} result: ${filledCount}/${totalAttrs} attributes filled (${fillRate.toFixed(1)}%)`);

        return { success: true, data: allResults };
      } catch (error) {
        console.error(`[enrich-batch] Error enriching ${item.mpn}:`, error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    };

    let successCount = run.success_count || 0;
    let failedCount = run.failed_count || 0;
    let processedCount = run.current_index || 0;

    // Process in batches
    for (let i = 0; i < pendingItems.length; i += concurrency) {
      // Check if run was cancelled
      const { data: currentRun } = await supabase
        .from('user_enrichment_data')
        .select('status')
        .eq('id', runId)
        .single();

      if (currentRun?.status === 'cancelled') {
        console.log('[enrich-batch] Run cancelled');
        return;
      }

      const batch = pendingItems.slice(i, i + concurrency);
      console.log(`[enrich-batch] Processing batch ${Math.floor(i/concurrency) + 1}, ${batch.length} items`);
      
      const batchResults = await Promise.all(
        batch.map(async (item) => {
          const result = await enrichProduct(item);
          return { itemId: item.id, ...result };
        })
      );

      // Update each item's status in DB
      for (const result of batchResults) {
        if (result.success) {
          await supabase
            .from('enrichment_run_items')
            .update({ 
              status: 'success', 
              data: result.data,
              updated_at: new Date().toISOString()
            })
            .eq('id', result.itemId);
          successCount++;
        } else {
          await supabase
            .from('enrichment_run_items')
            .update({ 
              status: 'failed', 
              error: result.error,
              updated_at: new Date().toISOString()
            })
            .eq('id', result.itemId);
          failedCount++;
        }
        processedCount++;
      }

      // Update run progress
      await supabase
        .from('user_enrichment_data')
        .update({
          current_index: processedCount,
          success_count: successCount,
          failed_count: failedCount,
        })
        .eq('id', runId);
      
      console.log(`[enrich-batch] Progress: ${processedCount}/${run.total_count}`);
    }

    // Mark run as completed
    await supabase
      .from('user_enrichment_data')
      .update({ 
        status: 'completed',
        current_index: processedCount,
        success_count: successCount,
        failed_count: failedCount,
        completed_at: new Date().toISOString()
      })
      .eq('id', runId);

    console.log(`[enrich-batch] Run completed: ${runId}, success: ${successCount}, failed: ${failedCount}`);
  } catch (error) {
    console.error("[enrich-batch] Fatal error:", error);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    await supabase
      .from('user_enrichment_data')
      .update({ status: 'failed' })
      .eq('id', runId);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { runId, concurrency = DEFAULT_CONCURRENCY } = (await req.json()) as EnrichmentRequest;

    if (!runId) {
      return new Response(JSON.stringify({ success: false, error: 'runId is required' }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[enrich-batch] Starting run: ${runId}`);

    // Use waitUntil for background processing so the function continues after response
    EdgeRuntime.waitUntil(processEnrichmentRun(runId, concurrency));

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Run started',
      runId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[enrich-batch] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
