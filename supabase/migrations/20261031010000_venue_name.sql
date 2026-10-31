-- The venue's place name from Google (e.g. "First Presbyterian Church"), used
-- as the gig's title when it has no title or client. Null for plain street
-- addresses, which are never used as a title.
alter table public.gigs
  add column if not exists venue_name text;

notify pgrst, 'reload schema';
