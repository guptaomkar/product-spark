import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
  jobId: string;
  concurrency?: number;
}

const CONCURRENCY = 5; // Process 5 products in parallel

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { jobId, concurrency = CONCURRENCY } = (await req.json()) as EnrichmentRequest;

    console.log(`[enrich-batch] Starting job: ${jobId}`);

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('enrichment_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error('[enrich-batch] Job not found:', jobError);
      return new Response(JSON.stringify({ success: false, error: 'Job not found' }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (job.status === 'completed' || job.status === 'cancelled') {
      return new Response(JSON.stringify({ success: true, message: 'Job already finished' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update status to processing
    await supabase
      .from('enrichment_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId);

    const products = job.products as Product[];
    const attributes = job.attributes as { category: string; attributeName: string }[];
    const results = (job.results || {}) as Record<string, any>;
    let currentIndex = job.current_index || 0;
    let successCount = job.success_count || 0;
    let failedCount = job.failed_count || 0;

    const username = Deno.env.get("OXYLABS_USERNAME");
    const password = Deno.env.get("OXYLABS_PASSWORD");

    if (!username || !password) {
      await supabase
        .from('enrichment_jobs')
        .update({ status: 'failed', error: 'Oxylabs credentials not configured' })
        .eq('id', jobId);
      return new Response(JSON.stringify({ success: false, error: 'Oxylabs credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = btoa(`${username}:${password}`);

    // Helper to get attributes for a category
    const getAttributesForCategory = (category: string): string[] => {
      return attributes
        .filter(attr => attr.category.toLowerCase() === category.toLowerCase())
        .map(attr => attr.attributeName);
    };

    // Enrich a single product
    const enrichProduct = async (product: Product): Promise<{ success: boolean; data?: Record<string, string>; error?: string }> => {
      try {
        const categoryAttributes = getAttributesForCategory(product.category);
        if (categoryAttributes.length === 0) {
          return { success: true, data: {} };
        }

        const allResults: Record<string, string> = {};
        for (const attr of categoryAttributes) {
          allResults[attr] = "";
        }

        // Split into batches
        const baseQueryLength = `JSON specs for ${product.mfr} ${product.mpn}: `.length;
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

        // Process batches sequentially (to avoid rate limiting)
        for (const batch of batches) {
          const query = `JSON specs for ${product.mfr} ${product.mpn}: ${batch.join(", ")}`;

          const payload = {
            source: "google_ai_mode",
            query: query,
            geo_location: "United States",
            parse: true,
            render: "html",
          };

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
            const batchResults = parseAttributeValues(responseText, batch);
            for (const [key, value] of Object.entries(batchResults)) {
              if (value && value !== "") {
                allResults[key] = value;
              }
            }
          }
          
          // Small delay between batches
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        return { success: true, data: allResults };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    };

    // Process products in batches with concurrency
    const pendingProducts = products.slice(currentIndex);
    
    for (let i = 0; i < pendingProducts.length; i += concurrency) {
      // Check if job was cancelled
      const { data: currentJob } = await supabase
        .from('enrichment_jobs')
        .select('status')
        .eq('id', jobId)
        .single();

      if (currentJob?.status === 'cancelled') {
        console.log('[enrich-batch] Job cancelled');
        return new Response(JSON.stringify({ success: true, message: 'Job cancelled' }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const batch = pendingProducts.slice(i, i + concurrency);
      
      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(async (product) => {
          const result = await enrichProduct(product);
          return { productId: product.id, ...result };
        })
      );

      // Update results
      for (const result of batchResults) {
        if (result.success) {
          results[result.productId] = { status: 'success', data: result.data };
          successCount++;
        } else {
          results[result.productId] = { status: 'failed', error: result.error };
          failedCount++;
        }
      }

      currentIndex += batch.length;

      // Update job progress
      await supabase
        .from('enrichment_jobs')
        .update({
          current_index: currentIndex,
          success_count: successCount,
          failed_count: failedCount,
          results: results,
        })
        .eq('id', jobId);
    }

    // Mark as completed
    await supabase
      .from('enrichment_jobs')
      .update({ 
        status: 'completed',
        current_index: products.length,
        success_count: successCount,
        failed_count: failedCount,
        results: results,
      })
      .eq('id', jobId);

    console.log(`[enrich-batch] Job completed: ${jobId}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Job completed',
      successCount,
      failedCount
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
