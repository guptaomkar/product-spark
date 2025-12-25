-- Add new fields to subscription_plans for the pricing card structure
ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS subtitle TEXT,
ADD COLUMN IF NOT EXISTS credits_display_text TEXT,
ADD COLUMN IF NOT EXISTS per_mpn_cost TEXT,
ADD COLUMN IF NOT EXISTS main_feature_text TEXT;