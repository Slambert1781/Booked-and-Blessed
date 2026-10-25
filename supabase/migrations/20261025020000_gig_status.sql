-- Gig decisions: every checked gig starts undecided, then is taken or declined.
alter table public.gigs
  add column if not exists status text not null default 'undecided'
    check (status in ('undecided', 'taken', 'declined')),
  add column if not exists decided_at timestamptz;

create index if not exists gigs_user_status_idx on public.gigs (user_id, status);
