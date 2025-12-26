-- Persist enrichment runs + per-product results for background processing & history

-- 1) Enrichment runs table (reuse existing user_enrichment_data)
ALTER TABLE public.user_enrichment_data
  ADD COLUMN IF NOT EXISTS total_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_index integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS success_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS started_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_user_enrichment_data_user_updated_at
  ON public.user_enrichment_data (user_id, updated_at DESC);

-- RLS for runs
ALTER TABLE public.user_enrichment_data ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_enrichment_data' AND policyname='Users can view their own enrichment runs'
  ) THEN
    CREATE POLICY "Users can view their own enrichment runs"
      ON public.user_enrichment_data
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_enrichment_data' AND policyname='Users can create their own enrichment runs'
  ) THEN
    CREATE POLICY "Users can create their own enrichment runs"
      ON public.user_enrichment_data
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_enrichment_data' AND policyname='Users can update their own enrichment runs'
  ) THEN
    CREATE POLICY "Users can update their own enrichment runs"
      ON public.user_enrichment_data
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_enrichment_data' AND policyname='Users can delete their own enrichment runs'
  ) THEN
    CREATE POLICY "Users can delete their own enrichment runs"
      ON public.user_enrichment_data
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- updated_at trigger for runs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_enrichment_data_updated_at') THEN
    CREATE TRIGGER trg_user_enrichment_data_updated_at
    BEFORE UPDATE ON public.user_enrichment_data
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;


-- 2) Per-product results table
CREATE TABLE IF NOT EXISTS public.enrichment_run_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.user_enrichment_data(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  mfr text,
  mpn text,
  category text,
  status text NOT NULL DEFAULT 'pending',
  data jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_enrichment_run_items_run_status
  ON public.enrichment_run_items (run_id, status);

-- RLS for items
ALTER TABLE public.enrichment_run_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='enrichment_run_items' AND policyname='Users can view their own enrichment run items'
  ) THEN
    CREATE POLICY "Users can view their own enrichment run items"
      ON public.enrichment_run_items
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.user_enrichment_data r
          WHERE r.id = run_id AND r.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='enrichment_run_items' AND policyname='Users can create their own enrichment run items'
  ) THEN
    CREATE POLICY "Users can create their own enrichment run items"
      ON public.enrichment_run_items
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_enrichment_data r
          WHERE r.id = run_id AND r.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='enrichment_run_items' AND policyname='Users can update their own enrichment run items'
  ) THEN
    CREATE POLICY "Users can update their own enrichment run items"
      ON public.enrichment_run_items
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.user_enrichment_data r
          WHERE r.id = run_id AND r.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_enrichment_data r
          WHERE r.id = run_id AND r.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='enrichment_run_items' AND policyname='Users can delete their own enrichment run items'
  ) THEN
    CREATE POLICY "Users can delete their own enrichment run items"
      ON public.enrichment_run_items
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.user_enrichment_data r
          WHERE r.id = run_id AND r.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- updated_at trigger for items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enrichment_run_items_updated_at') THEN
    CREATE TRIGGER trg_enrichment_run_items_updated_at
    BEFORE UPDATE ON public.enrichment_run_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;


-- 3) Link jobs to runs (for background resumability)
ALTER TABLE public.enrichment_jobs
  ADD COLUMN IF NOT EXISTS run_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema='public'
      AND table_name='enrichment_jobs'
      AND constraint_name='enrichment_jobs_run_id_fkey'
  ) THEN
    ALTER TABLE public.enrichment_jobs
      ADD CONSTRAINT enrichment_jobs_run_id_fkey
      FOREIGN KEY (run_id)
      REFERENCES public.user_enrichment_data(id)
      ON DELETE SET NULL;
  END IF;
END $$;