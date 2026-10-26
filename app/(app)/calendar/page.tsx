import Link from "next/link";
import { addMonths, monthGrid, monthKey, parseMonth, type Month } from "@/lib/calendar";
import { formatDate, formatMoney, formatTime } from "@/lib/format";
import { resultForSavedGig, statusOf, type GigRow, type ServiceRow } from "@/lib/gigs";
import { createClient } from "@/lib/supabase/server";

// "Today" for the default month and highlight. The server runs in UTC, so
// pick the family's local zone instead.
const TIME_ZONE = "America/Los_Angeles";

type Entry = { gigId: string; title: string; date: string; time: string | null };
type Money = { takeHome: number; pay: number; services: number };
/** One gig's services within a list, with its money. */
type GigGroup = { gigId: string; title: string; entries: Entry[]; money: Money };
type GigWithServices = GigRow & { gig_services: ServiceRow[] };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: TIME_ZONE }); // YYYY-MM-DD
  const thisMonth: Month = { year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) };
  const month = parseMonth((await searchParams).month, thisMonth);
  const key = monthKey(month);

  const supabase = await createClient();
  const { data: gigs } = await supabase
    .from("gigs")
    .select("*, gig_services(id, service_date, start_time)")
    .returns<GigWithServices[]>();

  const taken = (gigs ?? []).filter((g) => statusOf(g) === "taken");
  const entries: Entry[] = taken
    .flatMap((g) =>
      g.gig_services.map((s) => ({
        gigId: g.id,
        title: g.title || g.venue_address.split(",")[0],
        date: s.service_date,
        time: s.start_time,
      })),
    )
    .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")));

  const money = new Map<string, Money>(
    taken.map((g) => {
      const r = resultForSavedGig(g, g.gig_services);
      return [g.id, { takeHome: r.realTakeHome, pay: r.totalPay, services: g.gig_services.length }];
    }),
  );

  const byDate = new Map<string, Entry[]>();
  for (const e of entries) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);
  const inMonth = entries.filter((e) => e.date.startsWith(key));
  const monthGroups = groupByGig(inMonth, money);
  // A gig running into another month counts here in proportion to its services this month.
  const monthTotals = monthGroups.reduce(
    (t, g) => {
      const share = g.entries.length / Math.max(g.money.services, 1);
      return { takeHome: t.takeHome + g.money.takeHome * share, pay: t.pay + g.money.pay * share };
    },
    { takeHome: 0, pay: 0 },
  );
  const upcomingGroups = groupByGig(
    entries.filter((e) => e.date >= today),
    money,
  ).slice(0, 5);

  const label = new Date(Date.UTC(month.year, month.month - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6 lg:max-w-4xl">
      <h1 className="text-2xl font-semibold">Calendar</h1>
      <p className="mt-1 text-sm text-stone-600">Rehearsals and concerts for gigs you&apos;ve booked.</p>

      <div className="mt-5 flex items-center justify-between">
        <Link href={`/calendar?month=${monthKey(addMonths(month, -1))}`} className="btn-secondary px-3 py-2" aria-label="Previous month">
          ‹
        </Link>
        <div className="text-center">
          <p className="text-lg font-semibold">{label}</p>
          {key !== monthKey(thisMonth) && (
            <Link href="/calendar" className="text-xs text-indigo-700">
              Back to this month
            </Link>
          )}
        </div>
        <Link href={`/calendar?month=${monthKey(addMonths(month, 1))}`} className="btn-secondary px-3 py-2" aria-label="Next month">
          ›
        </Link>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-stone-200 text-center text-xs font-medium text-stone-500">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        {monthGrid(month).map((week, i) => (
          <div key={i} className="grid grid-cols-7 border-b border-stone-100 last:border-b-0">
            {week.map((date, j) => {
              const items = date ? (byDate.get(date) ?? []) : [];
              const isToday = date === today;
              return (
                <div key={j} className={`min-h-14 border-r border-stone-100 p-1 last:border-r-0 lg:min-h-24 ${date ? "" : "bg-stone-50"}`}>
                  {date && (
                    <>
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday ? "bg-indigo-700 font-semibold text-white" : "text-stone-700"}`}
                      >
                        {Number(date.slice(8))}
                      </span>
                      {/* Phones: a dot per service. Wider screens: the gig name. */}
                      <div className="mt-0.5 flex flex-wrap gap-0.5 lg:hidden">
                        {items.map((e, k) => (
                          <span key={k} className="h-2 w-2 rounded-full bg-emerald-600" />
                        ))}
                      </div>
                      <div className="hidden space-y-0.5 lg:block">
                        {items.map((e, k) => (
                          <Link
                            key={k}
                            href={`/gigs/${e.gigId}`}
                            className="block truncate rounded bg-emerald-100 px-1 py-0.5 text-xs text-emerald-900"
                          >
                            {e.time ? `${formatTime(e.time)} ` : ""}
                            {e.title}
                          </Link>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">This month</h2>
        {monthGroups.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">Nothing booked in {label}.</p>
        ) : (
          <>
            <div className="mt-2 rounded-2xl bg-indigo-700 px-4 py-3 text-white">
              <p className="text-sm text-indigo-200">Take-home in {label}</p>
              <p className="text-3xl font-bold tabular-nums">{formatMoney(monthTotals.takeHome)}</p>
              <p className="text-sm text-indigo-100 tabular-nums">from {formatMoney(monthTotals.pay)} pay, after travel</p>
            </div>
            <GigList groups={monthGroups} />
          </>
        )}
      </section>

      {key !== monthKey(thisMonth) || inMonth.length === 0 ? (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Coming up</h2>
          {upcomingGroups.length === 0 ? (
            <p className="mt-2 text-sm text-stone-500">
              No upcoming gigs. Open a gig and tap <strong>Book it</strong> to add it here.
            </p>
          ) : (
            <GigList groups={upcomingGroups} />
          )}
        </section>
      ) : null}
    </main>
  );
}

function groupByGig(entries: Entry[], money: Map<string, Money>): GigGroup[] {
  const groups = new Map<string, GigGroup>();
  for (const e of entries) {
    const g = groups.get(e.gigId);
    if (g) g.entries.push(e);
    else groups.set(e.gigId, { gigId: e.gigId, title: e.title, entries: [e], money: money.get(e.gigId)! });
  }
  return [...groups.values()]; // already in date order of each gig's first service
}

function GigList({ groups }: { groups: GigGroup[] }) {
  return (
    <ul className="mt-3 space-y-3">
      {groups.map((g) => (
        <li key={g.gigId}>
          <Link href={`/gigs/${g.gigId}`} className="block rounded-2xl bg-white p-4 shadow-sm active:bg-stone-50">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 truncate font-semibold">{g.title}</p>
              <div className="shrink-0 text-right">
                <p
                  className={`text-lg font-bold tabular-nums ${g.money.takeHome < 0 ? "text-red-700" : "text-indigo-700"}`}
                >
                  {formatMoney(g.money.takeHome)}
                </p>
                <p className="text-xs text-stone-500 tabular-nums">of {formatMoney(g.money.pay)} pay</p>
              </div>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-stone-600">
              {g.entries.map((e, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span>{formatDate(e.date)}</span>
                  <span>{formatTime(e.time)}</span>
                </li>
              ))}
            </ul>
          </Link>
        </li>
      ))}
    </ul>
  );
}
