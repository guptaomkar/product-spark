-- Add RLS policy for users to insert their own usage logs
CREATE POLICY "Users can insert own usage logs"
ON public.usage_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add RLS policy for users to update their own subscription (for credit consumption)
CREATE POLICY "Users can update own subscription credits"
ON public.user_subscriptions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);