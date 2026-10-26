-- Food costs and food stipends.

-- What each meal costs you, defaulting to the federal (GSA) standard per diem
-- for meals and incidentals ($68 a day). Editable in the profile.
alter table public.profiles
  add column if not exists meal_breakfast_rate numeric(8, 2) not null default 16 check (meal_breakfast_rate >= 0),
  add column if not exists meal_lunch_rate numeric(8, 2) not null default 19 check (meal_lunch_rate >= 0),
  add column if not exists meal_dinner_rate numeric(8, 2) not null default 28 check (meal_dinner_rate >= 0),
  add column if not exists meal_incidentals_rate numeric(8, 2) not null default 5 check (meal_incidentals_rate >= 0);

-- Per gig:
--   eating_out: buying food on this gig
--   meals: which meals each day, e.g. {"breakfast": false, "lunch": true, "dinner": true, "incidentals": false}
--   meal_rates_used: the meal prices it was worked out with, so a saved
--     result doesn't change when the profile does (null on gigs saved before
--     food costs existed: they show no food cost until edited)
--   food_stipend_type / food_stipend_amount: a food allowance the employer
--     pays, per day away or as one flat amount (null = none)
alter table public.gigs
  add column if not exists eating_out boolean not null default true,
  add column if not exists meals jsonb,
  add column if not exists meal_rates_used jsonb,
  add column if not exists food_stipend_type text check (food_stipend_type in ('per_day', 'flat')),
  add column if not exists food_stipend_amount numeric(10, 2) check (food_stipend_amount >= 0);

notify pgrst, 'reload schema';
