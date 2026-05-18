ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS created_with_ai BOOLEAN NOT NULL DEFAULT false;
