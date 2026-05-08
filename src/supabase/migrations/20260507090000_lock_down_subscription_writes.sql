LOVABLE_API_KEY="таны_түлхүүр"-- Prevent client-side self-upgrades. Subscription changes must come from
-- trusted server code (service role), verified checkout, or admin actions.
DROP POLICY IF EXISTS "Users insert own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users update own subscription" ON public.subscriptions;
