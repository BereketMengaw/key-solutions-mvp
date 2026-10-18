-- Key Solutions demo: live updates for the kitchen and waiter screens.
-- Realtime respects RLS, so subscribers only receive rows they can select.

alter publication supabase_realtime add table public.orders, public.order_items;
