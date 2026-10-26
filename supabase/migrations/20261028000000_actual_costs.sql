-- Past gigs: what a gig actually paid and cost, entered after it happened.
-- Null = use the estimate for that line.
alter table public.gigs
  add column if not exists actual_pay numeric(10, 2) check (actual_pay >= 0),
  add column if not exists actual_gas_cost numeric(10, 2) check (actual_gas_cost >= 0),
  add column if not exists actual_food_cost numeric(10, 2) check (actual_food_cost >= 0),
  add column if not exists actual_lodging_cost numeric(10, 2) check (actual_lodging_cost >= 0),
  -- Entered after it was played (no estimate beforehand, so nothing to compare).
  add column if not exists logged_after boolean not null default false;

notify pgrst, 'reload schema';
