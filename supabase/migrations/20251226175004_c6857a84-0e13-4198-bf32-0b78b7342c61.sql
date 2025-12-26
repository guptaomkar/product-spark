-- Create enrichment_jobs table to persist executions
CREATE TABLE public.enrichment_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  products JSONB NOT NULL DEFAULT '[]',
  attributes JSONB NOT NULL DEFAULT '[]',
  current_index INTEGER NOT NULL DEFAULT 0,
  total_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  results JSONB NOT NULL DEFAULT '{}',
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.enrichment_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own jobs"
  ON public.enrichment_jobs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs"
  ON public.enrichment_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
  ON public.enrichment_jobs
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all jobs"
  ON public.enrichment_jobs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add device revoked_at column for session invalidation
ALTER TABLE public.user_devices ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE;

-- Create trigger to update updated_at
CREATE TRIGGER update_enrichment_jobs_updated_at
  BEFORE UPDATE ON public.enrichment_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for enrichment_jobs
ALTER PUBLICATION supabase_realtime ADD TABLE public.enrichment_jobs;

-- Enable realtime for user_subscriptions (for credit updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_subscriptions;