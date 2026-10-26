-- Food costs.

-- Meal rates on the profile (optional, editable).
--   local_meal_rate: a local gig day, roughly one meal out
--   overnight_meal_rate: a day away overnight, the federal per diem for meals
alter table public.profiles
  add column if not exists local_meal_rate numeric(8, 2) not null default 20 check (local_meal_rate >= 0),
  add column if not exists overnight_meal_rate numeric(8, 2) not null default 68 check (overnight_meal_rate >= 0);

-- Per gig: whether you're eating out, and the meal rates it was worked out
-- with, so a saved result doesn't change when the profile does. Gigs saved
-- before this update keep null rates and so show no food cost.
alter table public.gigs
  add column if not exists eating_out boolean not null default true,
  add column if not exists local_meal_rate_used numeric(8, 2) check (local_meal_rate_used >= 0),
  add column if not exists overnight_meal_rate_used numeric(8, 2) check (overnight_meal_rate_used >= 0);

notify pgrst, 'reload schema';
