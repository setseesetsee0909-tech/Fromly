CREATE TABLE public.manual_billing_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  plan plan_tier NOT NULL,
  amount_mnt INTEGER NOT NULL CHECK (amount_mnt > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  payer_name TEXT NOT NULL,
  transfer_reference TEXT NOT NULL,
  note TEXT,
  review_note TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.manual_billing_requests ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_manual_billing_requests_updated_at
  BEFORE UPDATE ON public.manual_billing_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
