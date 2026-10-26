-- Beta feedback: rehearsal vs performance per service, and a lodging nights override.

alter table public.gig_services
  add column if not exists kind text not null default 'rehearsal'
    check (kind in ('rehearsal', 'performance'));

-- Null = work it out from the service dates.
alter table public.gigs
  add column if not exists lodging_nights integer check (lodging_nights >= 1 and lodging_nights <= 60);

notify pgrst, 'reload schema';
