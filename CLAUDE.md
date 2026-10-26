# Booked and Blessed

A mobile-first web app for freelance classical musicians. It shows what a gig
really pays once travel is taken out: gas, drive time, lodging and food, plus
any mileage or lodging money the employer pays back. This file is the source
of truth for how Version 1.0 behaves. Keep it in step with the code.

## Stack and conventions

- Next.js (App Router), TypeScript, Tailwind CSS. Signed-in screens live in
  `app/(app)/`.
- Supabase: Postgres, Auth (email magic link) and Storage (profile photos).
  Row Level Security on every table; users only ever see their own rows.
- Vercel deploys from GitHub: `main` = production.
- Schema changes are SQL migrations in `supabase/migrations/`, run by hand in
  the Supabase SQL editor. Write them so they can be run twice safely
  (`add column if not exists`, `drop policy if exists` before `create policy`)
  and end with `notify pgrst, 'reload schema';`.
- API keys live in environment variables only (`.env.local`, Vercel). Outside
  APIs (Google Routes and Places, EIA, fueleconomy.gov) are called from server
  code only. Never expose a key to the browser.
- Mobile first: every screen must work at 375px wide with no sideways scroll.
- All gig maths lives in one pure, unit-tested function, `lib/calculateGig.ts`.
  Relationship and verdict rules live in `lib/relationships.ts`. Round money
  only for display.
- Checks: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.

## Profile (one-time setup, editable later)

- Name and optional photo
- Home address (with state, for gas prices)
- Car: year / make / model from fueleconomy.gov (no trim). The MPG is the
  average combined MPG across all versions of that model, shown with the
  range; or a typed-in MPG
- Playing rate per hour; optional driving rate (blank = playing rate)
- Optional minimum real hourly rate, tax set-aside %, typical service length
  (hours, default 2.5)
- Meal rates: **meals on a local gig day** (default $20, roughly one meal
  out) and **meals on an overnight or full day away** (default $68, the
  federal per diem rate for meals). Both optional and editable.
- Relationship tier discounts and Holiday Rush periods (see below)

## A gig

- Optional client, and an optional name (a copy must get its own, different
  name)
- How you're paid: **per service** (fee × number of services) or **one fee**
  for the whole gig. Stored as `gig_type` `orchestra` / `flat_fee`.
- Venue address; one-way miles and minutes from Google Routes, or typed in
- Services: each is a rehearsal or a performance, with a date, an optional
  start time (calendar only) and a length in hours
- Extras: union gig (with pension %), mileage reimbursement (per mile or
  flat), staying overnight (hosted or room cost per night, lodging stipend
  per night, number of nights), and **eating out** (on by default)
- Gas price: this week's EIA average for the state (or region, then
  national), or typed in
- Decision: undecided / booked (`taken`) / declined

## Calculation rules (`lib/calculateGig.ts`)

```
service_days     = number of distinct dates among the gig's services
round_trips      = staying_overnight ? 1 : service_days
nights           = staying_overnight ? (lodging_nights ?? max(service_days - 1, 1)) : 0

total_pay        = per_service ? fee_per_service * number_of_services : flat_fee
total_miles      = one_way_miles * 2 * round_trips
total_drive_hrs  = one_way_minutes * 2 / 60 * round_trips

gas_cost         = (total_miles / mpg) * gas_price_per_gallon
drive_time_cost  = total_drive_hrs * (driving_rate ?? playing_rate)

mileage_reimb    = !pays_mileage ? 0
                 : per_mile ? reimb_rate_per_mile * total_miles
                 : flat_reimb_amount
lodging_cost     = staying_overnight && !hosted ? room_cost_per_night * nights : 0
lodging_stipend  = staying_overnight ? stipend_per_night * nights : 0

food_cost        = !eating_out ? 0
                 : staying_overnight ? (nights + 1) * overnight_meal_rate
                 : service_days * local_meal_rate

take_home_before_tax = total_pay + mileage_reimb + lodging_stipend
                       - gas_cost - lodging_cost - food_cost - drive_time_cost
tax_set_aside        = total_pay * tax_rate_pct / 100
real_take_home       = take_home_before_tax - tax_set_aside

playing_hours    = sum of the services' lengths
net_cash         = total_pay + mileage_reimb + lodging_stipend
                   - gas_cost - lodging_cost - food_cost
real_hourly_rate = playing_hours > 0 ? net_cash / (playing_hours + total_drive_hrs) : none
pension          = union ? total_pay * pension_pct / 100 : 0   (shown separately, not take-home)
```

- The hourly rate and verdict are before tax (rates are quoted before tax).
- Each saved gig stores the lookups and profile values it was worked out with
  (miles, minutes, gas price and its source/date, MPG, playing and driving
  rates, meal rates), so its result never changes when gas prices or the
  profile change later. Tax %, minimum rate, tier discounts and rush periods
  are read live from the profile.
- If a lookup fails, say so clearly and let the user type the value in.

## Relationship tiers and the verdict (`lib/relationships.ts`)

- Tiers: New Face 0%, Familiar 10%, Faithful 20%, Favored 30%, Highly
  Favored 40% off the minimum hourly rate (editable in the profile).
- Holiday Rush (default Oct 1 to Dec 31, editable, repeats yearly): during a
  rush every client counts as one tier lower.
- Verdict, using net_cash plus any union pension per hour:
  green at or above the client's minimum; yellow within 15% below it;
  red further below, or whenever net_cash ≤ 0 (the hard floor: loyalty never
  means paying to play). The app explains each verdict in plain English.
- Each client page shows what booked gigs were worth per year.

## Result screen

Take-home shown largest (after tax). Then the real hourly rate with its
verdict and explanation, and a breakdown in this order: total pay, mileage
reimbursement, lodging stipend, gas, lodging, **food**, drive time, taxes.
Union pension appears separately. Then round trips, total miles and drive
time.

## Data model (Supabase)

Every user table has `user_id` → `auth.users` and owner-only RLS policies.

- **profiles**: home address (text, lat/lng, state), vehicle fields, mpg,
  mpg_is_manual, playing_rate, driving_rate, min_hourly_rate, tax_rate_pct,
  default_service_hours, local_meal_rate (default 20), overnight_meal_rate
  (default 68), tier_discounts, holiday_rush_enabled, rush_periods.
  (rush_discount_keep_pct is no longer used.)
- **gigs**: client_id, title, gig_type, venue (text, lat/lng), fees,
  mileage and lodging fields, lodging_nights, eating_out (default true),
  is_union, pension_pct, status, decided_at, and the stored values: one-way
  miles/minutes, gas price/source/date, mpg_used, playing_rate_used,
  driving_rate_used, local_meal_rate_used, overnight_meal_rate_used.
- **gig_services**: gig_id, kind (rehearsal | performance), service_date,
  start_time, duration_hours.
- **clients**: name, kind, tier, notes.
- **gas_price_cache**: shared EIA prices (read by signed-in users, written by
  the server with the service-role key), refreshed at most once a day.
- Storage bucket **avatars**: one folder per user.

## Not in Version 1.0

- Phone calendar sync
- Cartage pay
- Accompanying gigs, with different fees for rehearsals and performances
- Teaching gigs, with their own teaching fee
- AI-recommended client tiers
- Location-based gas prices from a paid source
- AI that reads a gig offer (a forwarded email or a calendar invite) and
  fills in a new gig for the user to check before saving
