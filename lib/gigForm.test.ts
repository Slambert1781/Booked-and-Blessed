import { describe, expect, it } from "vitest";
import type { GigRow } from "./gigs";
import { gigToFormValues } from "./gigForm";

const gig: GigRow = {
  id: "g1",
  title: "Messiah",
  gig_type: "orchestra",
  venue_address: "First Church, Corvallis, OR",
  venue_lat: 44.56,
  venue_lng: -123.26,
  fee_per_service: "150.00",
  number_of_services: 2,
  flat_fee: null,
  pays_mileage: true,
  reimb_type: "per_mile",
  reimb_rate_per_mile: "0.5000",
  flat_reimb_amount: null,
  staying_overnight: false,
  hosted: false,
  room_cost_per_night: null,
  stipend_per_night: null,
  one_way_miles: "31.20",
  one_way_minutes: "39.60",
  distance_is_manual: false,
  gas_price: "3.874",
  gas_price_source: "West Coast except California (PADD 5)",
  gas_price_date: "2026-10-19",
  mpg_used: 22,
  playing_rate_used: 50,
  driving_rate_used: null,
  status: "taken",
  is_union: true,
  pension_pct: "10.00",
  decided_at: "2026-10-20T00:00:00Z",
  created_at: "2026-10-20T00:00:00Z",
};
const services = [
  { id: "s1", service_date: "2026-12-05", start_time: "19:30:00", duration_hours: "2.50" },
  { id: "s2", service_date: "2026-12-06", start_time: null },
];

describe("gigToFormValues", () => {
  it("edit keeps every value, the saved gas price and the decision", () => {
    const v = gigToFormValues(gig, services, "edit");
    expect(v).toMatchObject({
      title: "Messiah",
      feePerService: "150",
      reimbRatePerMile: "0.5",
      miles: "31.2",
      minutes: "40",
      gasPrice: "3.874",
      gasSource: { areaName: "West Coast except California (PADD 5)", periodDate: "2026-10-19" },
      status: "taken",
      isUnion: true,
      pensionPct: "10",
    });
    expect(v.services).toEqual([
      { kind: "rehearsal", date: "2026-12-05", time: "19:30", hours: "2.5" },
      { kind: "rehearsal", date: "2026-12-06", time: "", hours: "" },
    ]);
    expect(v.venue).toMatchObject({ lat: 44.56, lng: -123.26 });
  });

  it("copy starts undecided and leaves gas to today's price", () => {
    const v = gigToFormValues(gig, services, "copy");
    expect(v.status).toBeNull();
    expect(v.gasPrice).toBe("");
    expect(v.gasSource).toBeNull();
    expect(v.feePerService).toBe("150"); // still editable on the form
    expect(v.title).toBe(""); // a copy needs a new name
    expect(v.eatingOut).toBe(true); // older gigs have no setting: on by default
    expect(v.countDriveTime).toBe(true);
  });

  it("a hand-typed gas price has no source", () => {
    const v = gigToFormValues({ ...gig, gas_price_source: "Entered by hand", gas_price_date: null }, services, "edit");
    expect(v.gasSource).toBeNull();
    expect(v.gasPrice).toBe("3.874");
  });
});

describe("past gig helpers", () => {
  it("isPlayed: booked and all dates passed", async () => {
    const { isPlayed, canCompare, actualsOf } = await import("./gigs");
    const svc = [{ id: "a", service_date: "2026-10-01", start_time: null }];
    expect(isPlayed(gig, svc, "2026-10-26")).toBe(true);
    expect(isPlayed({ ...gig, status: "undecided" }, svc, "2026-10-26")).toBe(false);
    expect(isPlayed(gig, [...svc, { id: "b", service_date: "2026-11-01", start_time: null }], "2026-10-26")).toBe(false);
    expect(actualsOf(gig)).toBeNull();
    expect(canCompare({ ...gig, actual_gas_cost: "41.00" })).toBe(true);
    expect(canCompare({ ...gig, actual_gas_cost: "41.00", logged_after: true })).toBe(false);
  });
});

describe("gigName", () => {
  it("title, then client, then venue name, never the street address", async () => {
    const { gigName } = await import("./gigs");
    const svc = [{ id: "a", service_date: "2026-12-05", start_time: null }];
    expect(gigName(gig, "Willamette Symphony")).toBe("Messiah");
    expect(gigName({ ...gig, title: null }, "Willamette Symphony")).toBe("Willamette Symphony");
    expect(gigName({ ...gig, title: "  ", venue_name: "First Church" }, null)).toBe("First Church");
    expect(gigName({ ...gig, title: null, venue_name: null }, null, svc)).toBe("Gig on Sat, Dec 5, 2026");
    expect(gigName({ ...gig, title: null }, null)).not.toContain("Corvallis");
  });
});
