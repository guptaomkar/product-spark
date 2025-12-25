-- Create RPC function for atomic credit consumption
CREATE OR REPLACE FUNCTION public.consume_credit(
  p_user_id UUID,
  p_feature TEXT,
  p_credits_to_consume INTEGER DEFAULT 1,
  p_request_data JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_subscription_id UUID;
  v_credits_remaining INTEGER;
  v_credits_used INTEGER;
  v_log_id UUID;
BEGIN
  -- Get current subscription with lock to prevent race conditions
  SELECT id, credits_remaining, credits_used
  INTO v_subscription_id, v_credits_remaining, v_credits_used
  FROM user_subscriptions
  WHERE user_id = p_user_id AND status = 'active'
  FOR UPDATE;

  IF v_subscription_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active subscription found');
  END IF;

  IF v_credits_remaining < p_credits_to_consume THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits', 'credits_remaining', v_credits_remaining);
  END IF;

  -- Atomically update credits
  UPDATE user_subscriptions
  SET 
    credits_remaining = credits_remaining - p_credits_to_consume,
    credits_used = credits_used + p_credits_to_consume,
    updated_at = now()
  WHERE id = v_subscription_id;

  -- Log the usage
  INSERT INTO usage_logs (user_id, feature, credits_used, request_data)
  VALUES (p_user_id, p_feature, p_credits_to_consume, p_request_data)
  RETURNING id INTO v_log_id;

  RETURN jsonb_build_object(
    'success', true, 
    'credits_remaining', v_credits_remaining - p_credits_to_consume,
    'credits_used', v_credits_used + p_credits_to_consume,
    'log_id', v_log_id
  );
END;
$$;