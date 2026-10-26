-- Real hourly rate, tax set-aside and union pension.

-- Profile settings
alter table public.profiles
  add column if not exists min_hourly_rate numeric(10, 2) check (min_hourly_rate >= 0),
  add column if not exists tax_rate_pct numeric(5, 2) check (tax_rate_pct >= 0 and tax_rate_pct <= 100),
  add column if not exists default_service_hours numeric(4, 2) not null default 2.5 check (default_service_hours > 0);

-- How long each rehearsal or concert lasts
alter table public.gig_services
  add column if not exists duration_hours numeric(4, 2) check (duration_hours > 0);

-- Union gigs and the pension contribution the employer pays
alter table public.gigs
  add column if not exists is_union boolean not null default false,
  add column if not exists pension_pct numeric(5, 2) check (pension_pct >= 0 and pension_pct <= 100);

notify pgrst, 'reload schema';
