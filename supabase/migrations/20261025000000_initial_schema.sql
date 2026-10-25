-- Booked and Blessed: initial schema.
-- Every user-owned table has user_id -> auth.users and RLS limiting rows to their owner.

-- ---------------------------------------------------------------------------
-- profiles: one row per user
-- ---------------------------------------------------------------------------
create table public.profiles (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  home_address       text,
  home_lat           double precision,
  home_lng           double precision,
  home_state         text,                -- two-letter code, e.g. 'TX'
  vehicle_year       integer,
  vehicle_make       text,
  vehicle_model      text,
  vehicle_option     text,                -- trim/options label from fueleconomy.gov
  fueleconomy_id     integer,
  mpg                numeric(6, 2) check (mpg > 0),
  mpg_is_manual      boolean not null default false,
  playing_rate       numeric(10, 2) check (playing_rate >= 0),
  driving_rate       numeric(10, 2) check (driving_rate >= 0),  -- null = use playing_rate
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: owner can read"   on public.profiles for select using (auth.uid() = user_id);
create policy "profiles: owner can insert" on public.profiles for insert with check (auth.uid() = user_id);
create policy "profiles: owner can update" on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "profiles: owner can delete" on public.profiles for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- gigs
-- ---------------------------------------------------------------------------
create table public.gigs (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title                text,
  gig_type             text not null check (gig_type in ('orchestra', 'flat_fee')),

  venue_address        text not null,
  venue_lat            double precision,
  venue_lng            double precision,

  fee_per_service      numeric(10, 2) check (fee_per_service >= 0),
  number_of_services   integer check (number_of_services > 0),
  flat_fee             numeric(10, 2) check (flat_fee >= 0),

  pays_mileage         boolean not null default false,
  reimb_type           text check (reimb_type in ('per_mile', 'flat')),
  reimb_rate_per_mile  numeric(8, 4) check (reimb_rate_per_mile >= 0),
  flat_reimb_amount    numeric(10, 2) check (flat_reimb_amount >= 0),

  staying_overnight    boolean not null default false,
  hosted               boolean not null default false,
  room_cost_per_night  numeric(10, 2) check (room_cost_per_night >= 0),
  stipend_per_night    numeric(10, 2) check (stipend_per_night >= 0),

  -- Lookups stored with the gig so the result never changes later.
  one_way_miles        numeric(10, 2) check (one_way_miles >= 0),
  one_way_minutes      numeric(10, 2) check (one_way_minutes >= 0),
  distance_is_manual   boolean not null default false,
  gas_price            numeric(6, 3) check (gas_price >= 0),
  gas_price_source     text,              -- e.g. 'Texas' or 'Gulf Coast (PADD 3)' or 'Entered by hand'
  gas_price_date       date,
  -- Profile values used for this calculation, also frozen.
  mpg_used             numeric(6, 2),
  playing_rate_used    numeric(10, 2),
  driving_rate_used    numeric(10, 2),

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint orchestra_fields check (
    gig_type <> 'orchestra' or (fee_per_service is not null and number_of_services is not null)
  ),
  constraint flat_fee_fields check (gig_type <> 'flat_fee' or flat_fee is not null)
);

create index gigs_user_created_idx on public.gigs (user_id, created_at desc);

alter table public.gigs enable row level security;

create policy "gigs: owner can read"   on public.gigs for select using (auth.uid() = user_id);
create policy "gigs: owner can insert" on public.gigs for insert with check (auth.uid() = user_id);
create policy "gigs: owner can update" on public.gigs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "gigs: owner can delete" on public.gigs for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- gig_services: one row per rehearsal or concert
-- ---------------------------------------------------------------------------
create table public.gig_services (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  gig_id        uuid not null references public.gigs (id) on delete cascade,
  service_date  date not null,
  start_time    time,
  created_at    timestamptz not null default now()
);

create index gig_services_gig_idx on public.gig_services (gig_id, service_date, start_time);

alter table public.gig_services enable row level security;

-- Owner must own both the service row and the parent gig.
create policy "gig_services: owner can read" on public.gig_services for select
  using (auth.uid() = user_id);
create policy "gig_services: owner can insert" on public.gig_services for insert
  with check (auth.uid() = user_id and exists (select 1 from public.gigs g where g.id = gig_id and g.user_id = auth.uid()));
create policy "gig_services: owner can update" on public.gig_services for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and exists (select 1 from public.gigs g where g.id = gig_id and g.user_id = auth.uid()));
create policy "gig_services: owner can delete" on public.gig_services for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- gas_price_cache: shared by all users (gas prices aren't personal data).
-- Signed-in users can read it; only the server (service role) writes it.
-- ---------------------------------------------------------------------------
create table public.gas_price_cache (
  series_id    text primary key,
  area_name    text not null,
  price        numeric(6, 3) not null,
  period_date  date not null,
  fetched_at   timestamptz not null default now()
);

alter table public.gas_price_cache enable row level security;

create policy "gas_price_cache: signed-in users can read" on public.gas_price_cache for select
  to authenticated using (true);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger gigs_updated_at before update on public.gigs
  for each row execute function public.set_updated_at();
