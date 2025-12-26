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

interface Attribute {
  category: string;
  attributeName: string;
}

interface StartRunRequest {
  products: Product[];
  attributes: Attribute[];
  fileName?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { products, attributes, fileName } = (await req.json()) as StartRunRequest;

    if (!products || products.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No products provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!attributes || attributes.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No attributes provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[start-enrichment-run] User ${user.id} starting run with ${products.length} products`);

    // Check user has enough credits
    const { data: subscription, error: subError } = await supabase
      .from("user_subscriptions")
      .select("id, credits_remaining, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (subError) {
      console.error("[start-enrichment-run] Subscription fetch error:", subError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to check subscription" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscription) {
      return new Response(
        JSON.stringify({ success: false, error: "No active subscription found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (subscription.credits_remaining < products.length) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Insufficient credits: need ${products.length}, have ${subscription.credits_remaining}`,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Create the enrichment run
    const runFileName = fileName || `enrichment_${new Date().toISOString().split("T")[0]}`;
    const { data: run, error: runError } = await supabase
      .from("user_enrichment_data")
      .insert({
        user_id: user.id,
        file_name: runFileName,
        status: "pending",
        products_count: products.length,
        attributes: attributes,
        results: [],
        total_count: products.length,
        current_index: 0,
        success_count: 0,
        failed_count: 0,
      })
      .select()
      .single();

    if (runError || !run) {
      console.error("[start-enrichment-run] Failed to create run:", runError);
      return new Response(
        JSON.stringify({ success: false, error: runError?.message || "Failed to create run" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[start-enrichment-run] Run created: ${run.id}`);

    // 2. Insert all products as run items
    const itemsToInsert = products.map((product) => ({
      run_id: run.id,
      product_id: product.id,
      mfr: product.mfr,
      mpn: product.mpn,
      category: product.category,
      status: "pending",
    }));

    const { error: itemsError } = await supabase.from("enrichment_run_items").insert(itemsToInsert);

    if (itemsError) {
      console.error("[start-enrichment-run] Failed to create items:", itemsError);
      // Cleanup the run
      await supabase.from("user_enrichment_data").delete().eq("id", run.id);
      return new Response(
        JSON.stringify({ success: false, error: itemsError.message || "Failed to create items" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[start-enrichment-run] Items created: ${itemsToInsert.length}`);

    // 3. Trigger the enrich-batch function (fire-and-forget via internal fetch)
    // We call enrich-batch directly which uses EdgeRuntime.waitUntil for background processing
    const enrichBatchUrl = `${supabaseUrl}/functions/v1/enrich-batch`;
    
    fetch(enrichBatchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ runId: run.id }),
    }).catch((err) => {
      console.error("[start-enrichment-run] Failed to trigger enrich-batch:", err);
    });

    console.log(`[start-enrichment-run] Triggered enrich-batch for run: ${run.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        runId: run.id,
        message: "Enrichment run started. Processing continues in background.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[start-enrichment-run] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
