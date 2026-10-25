import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDateRange, formatMoney } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import {
  GIG_STATUSES,
  resultForSavedGig,
  STATUS_LABEL,
  statusOf,
  type GigRow,
  type GigStatus,
  type ServiceRow,
} from "@/lib/gigs";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { isProfileComplete } from "@/lib/types";

type GigWithServices = GigRow & { gig_services: ServiceRow[] };

type Filter = "all" | GigStatus;

export default async function Home({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const requested = (await searchParams).status;
  const filter: Filter = GIG_STATUSES.includes(requested as GigStatus) ? (requested as GigStatus) : "all";

  const result = await getProfile();
  if (!result) redirect("/sign-in");
  if (!isProfileComplete(result.profile)) redirect("/profile");

  const supabase = await createClient();
  const { data: gigs } = await supabase
    .from("gigs")
    .select("*, gig_services(id, service_date, start_time)")
    .order("created_at", { ascending: false })
    .returns<GigWithServices[]>();

  const all = gigs ?? [];
  const counts = { all: all.length, undecided: 0, taken: 0, declined: 0 };
  for (const g of all) counts[statusOf(g)]++;
  const shown = filter === "all" ? all : all.filter((g) => statusOf(g) === filter);
  const tabs: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    ...GIG_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] })),
  ];

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-6">
      <h1 className="text-2xl font-semibold">Your gigs</h1>

      {all.length > 0 && (
        <nav className="mt-4 grid grid-cols-4 gap-1 rounded-xl bg-stone-200 p-1 text-center text-sm">
          {tabs.map((t) => (
            <Link
              key={t.value}
              href={t.value === "all" ? "/" : `/?status=${t.value}`}
              className={`rounded-lg px-1 py-2 ${filter === t.value ? "bg-white font-semibold shadow-sm" : "text-stone-600"}`}
            >
              {t.label}
              <span className="block text-xs text-stone-500">{counts[t.value]}</span>
            </Link>
          ))}
        </nav>
      )}

      {!all.length ? (
        <div className="mt-10 rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="font-medium">No gigs yet</p>
          <p className="mt-1 text-sm text-stone-600">
            Add one to see what it really pays once travel is counted.
          </p>
        </div>
      ) : !shown.length ? (
        <p className="mt-10 text-center text-stone-500">No {STATUS_LABEL[filter as GigStatus].toLowerCase()} gigs.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {shown.map((gig) => {
            const r = resultForSavedGig(gig, gig.gig_services);
            return (
              <li key={gig.id}>
                <Link
                  href={`/gigs/${gig.id}`}
                  className="block rounded-2xl bg-white p-4 shadow-sm active:bg-stone-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{gig.title || gig.venue_address}</p>
                      {gig.title && <p className="truncate text-sm text-stone-600">{gig.venue_address}</p>}
                      <p className="mt-1 text-sm text-stone-500">
                        {formatDateRange(gig.gig_services.map((s) => s.service_date))}
                      </p>
                      <div className="mt-2">
                        <StatusBadge status={statusOf(gig)} />
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`text-lg font-bold tabular-nums ${r.realTakeHome < 0 ? "text-red-700" : "text-indigo-700"}`}
                      >
                        {formatMoney(r.realTakeHome)}
                      </p>
                      <p className="text-xs text-stone-500 tabular-nums">of {formatMoney(r.totalPay)} pay</p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-stone-50 via-stone-50 to-transparent px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8 lg:left-80">
        <Link href="/gigs/new" className="btn-primary mx-auto block max-w-md text-center text-lg shadow-lg">
          + New gig
        </Link>
      </div>
    </main>
  );
}
