import { describe, expect, it } from "vitest";
import { bookedTotalsByYear } from "./clientStats";
import type { GigRow } from "./gigs";

const gig = (id: string, status: string, fee: number, dates: string[]) =>
  ({
    id,
    title: null,
    gig_type: "orchestra",
    venue_address: "x",
    venue_lat: null,
    venue_lng: null,
    fee_per_service: fee,
    number_of_services: dates.length,
    flat_fee: null,
    pays_mileage: false,
    reimb_type: null,
    reimb_rate_per_mile: null,
    flat_reimb_amount: null,
    staying_overnight: false,
    hosted: false,
    room_cost_per_night: null,
    stipend_per_night: null,
    one_way_miles: 0,
    one_way_minutes: 0,
    distance_is_manual: false,
    gas_price: 3,
    gas_price_source: null,
    gas_price_date: null,
    mpg_used: 25,
    playing_rate_used: 50,
    driving_rate_used: null,
    status,
    created_at: "",
    gig_services: dates.map((d, i) => ({ id: `${id}${i}`, service_date: d, start_time: null })),
  }) as GigRow & { gig_services: { id: string; service_date: string; start_time: null }[] };

describe("bookedTotalsByYear", () => {
  it("adds up booked gigs per year and ignores undecided and declined", () => {
    const totals = bookedTotalsByYear([
      gig("a", "taken", 150, ["2026-03-01", "2026-03-02"]),
      gig("b", "taken", 200, ["2026-10-10"]),
      gig("c", "declined", 999, ["2026-05-05"]),
      gig("d", "undecided", 999, ["2026-06-06"]),
    ]);
    expect(totals).toEqual([{ year: 2026, services: 3, gigs: 2, pay: 500, takeHome: 500 }]);
  });

  it("splits a gig across years by its services", () => {
    const totals = bookedTotalsByYear([gig("a", "taken", 100, ["2026-12-30", "2027-01-02", "2027-01-03"])]);
    expect(totals.map((t) => [t.year, t.services, t.pay])).toEqual([
      [2027, 2, 200],
      [2026, 1, 100],
    ]);
  });
});
