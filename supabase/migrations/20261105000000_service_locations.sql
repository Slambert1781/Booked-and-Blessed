-- A rehearsal or performance can be somewhere other than the gig's venue.
-- All null = at the venue. The one-way drive from home is stored with it,
-- like the venue's, so a saved result never changes.
alter table public.gig_services
  add column if not exists location_address text,
  add column if not exists location_lat double precision,
  add column if not exists location_lng double precision,
  add column if not exists location_name text,
  add column if not exists location_miles numeric(10, 2) check (location_miles >= 0),
  add column if not exists location_minutes numeric(10, 2) check (location_minutes >= 0);

notify pgrst, 'reload schema';
