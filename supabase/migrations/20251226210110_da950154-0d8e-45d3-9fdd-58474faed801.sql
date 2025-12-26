-- Remove the unique constraint on tier column to allow multiple plans with same tier
ALTER TABLE public.subscription_plans DROP CONSTRAINT IF EXISTS subscription_plans_tier_key;