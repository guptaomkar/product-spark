-- Add display_order column for plan sequencing
ALTER TABLE public.subscription_plans 
ADD COLUMN display_order integer DEFAULT 0;

-- Set initial display order based on current price ordering
WITH ordered_plans AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY price_monthly ASC) as new_order
  FROM public.subscription_plans
)
UPDATE public.subscription_plans sp
SET display_order = op.new_order
FROM ordered_plans op
WHERE sp.id = op.id;