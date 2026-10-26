-- Per-gig switch: whether your time behind the wheel counts against the gig.
-- Off = no drive time cost, and the hourly rate uses playing hours only.
alter table public.gigs
  add column if not exists count_drive_time boolean not null default true;

notify pgrst, 'reload schema';
