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
- Home address (with state, for gas prices). Picked from Google suggestions
  so it has a map location; a typed address is looked up on save (with the
  state added), and drive lookups add the state to any address without one,
  so Google never guesses a same-named street in another state.
- Car: year / make / model from fueleconomy.gov (no trim). The MPG is the
  average combined MPG across all versions of that model, shown with the
  range; or a typed-in MPG
- Playing rate per hour; optional driving rate (blank = playing rate)
- Optional minimum real hourly rate, tax set-aside %, typical service length
  (hours, default 2.5)
- Meal prices: **breakfast, lunch, dinner and incidentals**, defaulting to
  the federal (GSA) standard per diem for meals and incidentals: $16, $19,
  $28 and $5 ($68 a day). Each can be changed; blank = the federal rate.
- Relationship tier discounts and Holiday Rush periods (see below)

## A gig

- **Client first, and required**: a type-ahead search of the client
  directory at the top of the form. Picking a client fills in their usual
  venue, pay type and fee, mileage terms and lodging terms (from
  `clients.gig_defaults`, updated each time a gig for them is saved), all
  editable. A name not in the directory offers "Add '[name]' as a new
  client" with a one-tap tier picker (New Face to start); the client is
  created when the gig is saved (or reused if one has that name).
- An optional gig name (a copy must get its own, different name)
- How you're paid: **per service** (fee × number of services) or **one fee**
  for the whole gig. Stored as `gig_type` `orchestra` / `flat_fee`.
- Venue address (required); one-way miles and minutes from Google Routes, or
  typed in
- Services: each is a rehearsal or a performance, with a date, an optional
  start time (calendar only) and a length in hours
- Extras: union gig (with pension %), mileage reimbursement (per mile or
  flat), staying overnight (hosted or room cost per night, lodging stipend
  per night, number of nights), **eating out** (on by default) with **which
  meals** each day (starts as dinner for a local gig, all four when staying
  overnight), a **food stipend** (per day or a flat amount), and **don't
  charge my drive time** (off by default, so drive time counts)
- Gas price: this week's EIA average for the state (or region, then
  national), or typed in
- Decision: undecided / booked (`taken`) / declined. A booked gig whose dates
  have all passed is labelled **Played** and no longer shows the decision.

## Past gigs: actual figures

- **Already played** (new gigs and copies): log a gig after it happened. It
  is saved as booked, with `logged_after` set, and its gas price is the EIA
  average for the week of its first date.
- **What it actually paid and cost**: pay received, gas, food and lodging.
  Shown for a gig entered as already played, and in Edit once every date of
  a saved gig has passed (a played gig without actuals prompts for them).
  Each box shows the estimate as a placeholder; blank = use the estimate.
- The result uses the actual figures, marking those lines **actual**. For a
  gig estimated beforehand (not `logged_after`), a **Compare with your
  estimate** link shows estimated vs actual pay, gas, food, lodging and
  take-home, with a one-line summary of the biggest difference.

## Calculation rules (`lib/calculateGig.ts`)

```
service_days     = number of distinct dates among the gig's services
round_trips      = staying_overnight ? 1 : service_days
nights           = staying_overnight ? (lodging_nights ?? max(service_days - 1, 1)) : 0

total_pay        = actual_pay ?? (per_service ? fee_per_service * number_of_services : flat_fee)
total_miles      = one_way_miles * 2 * round_trips
total_drive_hrs  = one_way_minutes * 2 / 60 * round_trips

gas_cost         = actual_gas ?? (total_miles / mpg) * gas_price_per_gallon
drive_time_cost  = count_drive_time ? total_drive_hrs * (driving_rate ?? playing_rate) : 0

mileage_reimb    = !pays_mileage ? 0
                 : per_mile ? reimb_rate_per_mile * total_miles
                 : flat_reimb_amount
lodging_cost     = actual_lodging ?? (staying_overnight && !hosted ? room_cost_per_night * nights : 0)
lodging_stipend  = staying_overnight ? stipend_per_night * nights : 0

days_away        = staying_overnight ? nights + 1 : service_days
daily_meal_cost  = sum of the profile price of each chosen meal
food_cost        = actual_food ?? (eating_out ? days_away * daily_meal_cost : 0)
food_stipend     = !pays_food_stipend ? 0
                 : per_day ? food_stipend_amount * days_away
                 : food_stipend_amount

take_home_before_tax = total_pay + mileage_reimb + lodging_stipend + food_stipend
                       - gas_cost - lodging_cost - food_cost - drive_time_cost
tax_set_aside        = total_pay * tax_rate_pct / 100
real_take_home       = take_home_before_tax - tax_set_aside

playing_hours    = sum of the services' lengths
net_cash         = total_pay + mileage_reimb + lodging_stipend + food_stipend
                   - gas_cost - lodging_cost - food_cost
counted_hours    = playing_hours + (count_drive_time ? total_drive_hrs : 0)
real_hourly_rate = playing_hours > 0 ? net_cash / counted_hours : none
pension          = union ? total_pay * pension_pct / 100 : 0   (shown separately, not take-home)
```

- The hourly rate and verdict are before tax (rates are quoted before tax).
- Each saved gig stores the lookups and profile values it was worked out with
  (miles, minutes, gas price and its source/date, MPG, playing and driving
  rates, meal prices), so its result never changes when gas prices or the
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
reimbursement, food stipend, lodging stipend, gas, lodging, **food** (days ×
daily cost, with the meals listed), drive time, taxes.
Union pension appears separately. Then round trips, total miles and drive
time.

## Help for users

- A first-time walkthrough on the gig list (`components/Tour.tsx`): short
  boxes pointing at New gig, the gig list, Calendar, Clients and the profile.
  Shown once per account; replayable.
- **How it works** (`app/(app)/guide/page.tsx`, in the menu): the full guide,
  one tap-to-open section per feature, with a Replay the quick tour button.
- When a feature is added or changed, update the guide (and the walkthrough
  if it touches the home screen) in the same change.

## Data model (Supabase)

Every user table has `user_id` → `auth.users` and owner-only RLS policies.

- **profiles**: home address (text, lat/lng, state), vehicle fields, mpg,
  mpg_is_manual, playing_rate, driving_rate, min_hourly_rate, tax_rate_pct,
  default_service_hours, meal_breakfast_rate / meal_lunch_rate /
  meal_dinner_rate / meal_incidentals_rate (defaults 16 / 19 / 28 / 5),
  tier_discounts, holiday_rush_enabled, rush_periods.
  (rush_discount_keep_pct is no longer used.)
- **gigs**: client_id, title, gig_type, venue (text, lat/lng), fees,
  mileage and lodging fields, lodging_nights, eating_out (default true),
  meals (which meals, jsonb), food_stipend_type (per_day | flat),
  food_stipend_amount,
  count_drive_time (default true), actual_pay / actual_gas_cost /
  actual_food_cost / actual_lodging_cost (null = use the estimate),
  logged_after (default false),
  is_union, pension_pct, status, decided_at, and the stored values: one-way
  miles/minutes, gas price/source/date, mpg_used, playing_rate_used,
  driving_rate_used, meal_rates_used (jsonb).
- **gig_services**: gig_id, kind (rehearsal | performance), service_date,
  start_time, duration_hours.
- **clients**: name, kind, tier, notes, gig_defaults (jsonb: venue and
  terms from the client's most recent gig).
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
