-- Client directory with relationship tiers, and Holiday Rush settings.

create table if not exists public.clients (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  kind        text not null default 'other'
                check (kind in ('orchestra', 'church', 'contractor', 'private', 'other')),
  tier        text not null default 'new_face'
                check (tier in ('new_face', 'familiar', 'faithful', 'favored', 'highly_favored')),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists clients_user_name_idx on public.clients (user_id, name);

alter table public.clients enable row level security;

drop policy if exists "clients: owner can read" on public.clients;
drop policy if exists "clients: owner can insert" on public.clients;
drop policy if exists "clients: owner can update" on public.clients;
drop policy if exists "clients: owner can delete" on public.clients;
create policy "clients: owner can read"   on public.clients for select using (auth.uid() = user_id);
create policy "clients: owner can insert" on public.clients for insert with check (auth.uid() = user_id);
create policy "clients: owner can update" on public.clients for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "clients: owner can delete" on public.clients for delete using (auth.uid() = user_id);

drop trigger if exists clients_updated_at on public.clients;
create trigger clients_updated_at before update on public.clients
  for each row execute function public.set_updated_at();

-- Which client a gig is for (optional). Deleting a client keeps its gigs.
alter table public.gigs
  add column if not exists client_id uuid references public.clients (id) on delete set null;
create index if not exists gigs_client_idx on public.gigs (client_id);

-- Relationship settings on the profile.
--   tier_discounts: % off the minimum hourly rate per tier, e.g. {"familiar": 10, ...}
--   rush_periods: yearly date ranges, e.g. [{"label": "Holiday season", "start": "10-01", "end": "12-31"}]
--   rush_discount_keep_pct: how much of each discount survives a rush (50 = halved)
alter table public.profiles
  add column if not exists tier_discounts jsonb,
  add column if not exists holiday_rush_enabled boolean not null default true,
  add column if not exists rush_periods jsonb not null
    default '[{"label": "Holiday season", "start": "10-01", "end": "12-31"}]'::jsonb,
  add column if not exists rush_discount_keep_pct numeric(5, 2) not null default 50
    check (rush_discount_keep_pct >= 0 and rush_discount_keep_pct <= 100);

notify pgrst, 'reload schema';
