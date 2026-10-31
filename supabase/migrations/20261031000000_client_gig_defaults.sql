-- Clients remember their usual venue and terms, so picking a client on the
-- gig form can fill them in. Updated every time a gig for the client is saved.
--   gig_defaults: {
--     venue: { address, lat, lng, name },
--     gigType, feePerService, flatFee,
--     paysMileage, reimbType, reimbRatePerMile, flatReimbAmount,
--     stayingOvernight, hosted, roomCostPerNight, stipendPerNight
--   }
alter table public.clients
  add column if not exists gig_defaults jsonb;

-- Fill it in for existing clients from their most recent gig.
update public.clients c
set gig_defaults = jsonb_build_object(
  'venue', jsonb_build_object('address', g.venue_address, 'lat', g.venue_lat, 'lng', g.venue_lng, 'name', null),
  'gigType', g.gig_type,
  'feePerService', g.fee_per_service,
  'flatFee', g.flat_fee,
  'paysMileage', g.pays_mileage,
  'reimbType', g.reimb_type,
  'reimbRatePerMile', g.reimb_rate_per_mile,
  'flatReimbAmount', g.flat_reimb_amount,
  'stayingOvernight', g.staying_overnight,
  'hosted', g.hosted,
  'roomCostPerNight', g.room_cost_per_night,
  'stipendPerNight', g.stipend_per_night
)
from (
  select distinct on (client_id) *
  from public.gigs
  where client_id is not null
  order by client_id, created_at desc
) g
where g.client_id = c.id and c.gig_defaults is null;

notify pgrst, 'reload schema';
