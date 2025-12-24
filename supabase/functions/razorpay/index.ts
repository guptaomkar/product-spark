import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as hexEncode } from "https://deno.land/std@0.190.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateOrderRequest {
  planTier: 'basic' | 'pro' | 'enterprise';
  billingCycle: 'monthly' | 'yearly';
}

interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  planTier: 'basic' | 'pro' | 'enterprise';
  billingCycle: 'monthly' | 'yearly';
}

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;

async function createOrder(amount: number, currency: string = "INR"): Promise<any> {
  const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
  
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amount * 100, // Razorpay expects amount in paise
      currency,
      receipt: `receipt_${Date.now()}`,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Razorpay order creation error:", error);
    throw new Error("Failed to create Razorpay order");
  }

  return response.json();
}

async function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string
): Promise<boolean> {
  const body = orderId + "|" + paymentId;
  
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(RAZORPAY_KEY_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signatureBuffer = await globalThis.crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body)
  );
  
  const expectedSignature = new TextDecoder().decode(hexEncode(new Uint8Array(signatureBuffer)));
  
  return expectedSignature === signature;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get current user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    if (action === "create-order" && req.method === "POST") {
      const { planTier, billingCycle }: CreateOrderRequest = await req.json();
      
      // Get plan pricing
      const { data: plan, error: planError } = await supabaseClient
        .from("subscription_plans")
        .select("*")
        .eq("tier", planTier)
        .single();

      if (planError || !plan) {
        return new Response(
          JSON.stringify({ error: "Plan not found" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const amount = billingCycle === "yearly" 
        ? parseFloat(plan.price_yearly) 
        : parseFloat(plan.price_monthly);

      const order = await createOrder(amount);

      console.log("Razorpay order created:", order.id);

      return new Response(
        JSON.stringify({
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          keyId: RAZORPAY_KEY_ID,
        }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );

    } else if (action === "verify-payment" && req.method === "POST") {
      const { 
        razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature,
        planTier,
        billingCycle
      }: VerifyPaymentRequest = await req.json();

      // Verify signature
      const isValid = await verifySignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );

      if (!isValid) {
        console.error("Invalid payment signature");
        return new Response(
          JSON.stringify({ error: "Invalid payment signature" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Get plan details
      const { data: plan, error: planError } = await supabaseClient
        .from("subscription_plans")
        .select("*")
        .eq("tier", planTier)
        .single();

      if (planError || !plan) {
        return new Response(
          JSON.stringify({ error: "Plan not found" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const amount = billingCycle === "yearly" 
        ? parseFloat(plan.price_yearly) 
        : parseFloat(plan.price_monthly);

      const periodEnd = new Date();
      if (billingCycle === "yearly") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      // Use service role client for admin operations
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Update or create subscription
      const { data: existingSub, error: subError } = await supabaseAdmin
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingSub) {
        // Update existing subscription
        await supabaseAdmin
          .from("user_subscriptions")
          .update({
            plan_id: plan.id,
            status: "active",
            credits_remaining: plan.monthly_credits,
            credits_used: 0,
            billing_cycle: billingCycle,
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd.toISOString(),
            razorpay_subscription_id: razorpay_order_id,
          })
          .eq("id", existingSub.id);
      } else {
        // Create new subscription
        await supabaseAdmin
          .from("user_subscriptions")
          .insert({
            user_id: user.id,
            plan_id: plan.id,
            status: "active",
            credits_remaining: plan.monthly_credits,
            credits_used: 0,
            billing_cycle: billingCycle,
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd.toISOString(),
            razorpay_subscription_id: razorpay_order_id,
          });
      }

      // Record payment
      await supabaseAdmin
        .from("payments")
        .insert({
          user_id: user.id,
          subscription_id: existingSub?.id,
          razorpay_payment_id,
          razorpay_order_id,
          razorpay_signature,
          amount,
          currency: "INR",
          status: "completed",
          plan_tier: planTier,
        });

      console.log("Payment verified and subscription updated for user:", user.id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

  } catch (error: any) {
    console.error("Payment error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
