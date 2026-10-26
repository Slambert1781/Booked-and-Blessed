import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDateRange, formatMoney } from "@/lib/format";
import { SavedBanner } from "@/components/SavedBanner";
import { StatusBadge } from "@/components/StatusBadge";
import { Tour } from "@/components/Tour";
import { relationshipSettingsFrom, verdictFor } from "@/lib/clients";
import { listClients } from "@/lib/clientsServer";
import { todayISO } from "@/lib/today";
import {
  GIG_STATUSES,
  isPlayed,
  resultForSavedGig,
  settingsFrom,
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

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; tour?: string; saved?: string }>;
}) {
  const { status: requested, tour, saved } = await searchParams;
  const filter: Filter = GIG_STATUSES.includes(requested as GigStatus) ? (requested as GigStatus) : "all";

  const result = await getProfile();
  if (!result) redirect("/sign-in");
  if (!isProfileComplete(result.profile)) redirect("/profile");

  const supabase = await createClient();
  const { data: gigs } = await supabase
    .from("gigs")
    .select("*, gig_services(*)")
    .order("created_at", { ascending: false })
    .returns<GigWithServices[]>();

  const settings = settingsFrom(result.profile);
  const today = todayISO();
  const rel = relationshipSettingsFrom(result.profile);
  const clientsById = new Map((await listClients()).map((c) => [c.id, c]));
  const all = gigs ?? [];
  const counts = { all: all.length, undecided: 0, taken: 0, declined: 0 };
  for (const g of all) counts[statusOf(g)]++;
  const savedGig = saved ? all.find((g) => g.id === saved) : undefined;
  const shown = filter === "all" ? all : all.filter((g) => statusOf(g) === filter);
  const tabs: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    ...GIG_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] })),
  ];

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-6">
      <h1 className="text-2xl font-semibold">Your gigs</h1>

      {savedGig && (
        <SavedBanner
          key={savedGig.id}
          gigId={savedGig.id}
          text={`Saved: ${savedGig.title || savedGig.venue_address.split(",")[0]} · ${formatMoney(
            resultForSavedGig(savedGig, savedGig.gig_services, settings).realTakeHome,
          )} take-home`}
        />
      )}

      {all.length > 0 && (
        <nav data-tour="gigs" className="mt-4 grid grid-cols-4 gap-1 rounded-xl bg-stone-200 p-1 text-center text-sm">
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
        <div data-tour="gigs" className="mt-10 rounded-2xl bg-white p-6 text-center shadow-sm">
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
            const r = resultForSavedGig(gig, gig.gig_services, settings);
            const client = gig.client_id ? (clientsById.get(gig.client_id) ?? null) : null;
            const v = verdictFor(
              r,
              gig.gig_services.map((s) => s.service_date),
              client,
              rel,
            );
            return (
              <li key={gig.id}>
                <Link
                  href={`/gigs/${gig.id}`}
                  className="block rounded-2xl bg-white p-4 shadow-sm active:bg-stone-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{gig.title || gig.venue_address}</p>
                      {(client || gig.title) && (
                        <p className="truncate text-sm text-stone-600">
                          {client ? client.name : gig.venue_address}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-stone-500">
                        {formatDateRange(gig.gig_services.map((s) => s.service_date))}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={statusOf(gig)} played={isPlayed(gig, gig.gig_services, today)} />
                        {(r.realHourlyRate !== null || v) && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium tabular-nums text-stone-600">
                            {v && (
                              <span
                                aria-label={v.verdict}
                                className={`h-2.5 w-2.5 rounded-full ${v.verdict === "green" ? "bg-emerald-500" : v.verdict === "yellow" ? "bg-amber-400" : "bg-red-500"}`}
                              />
                            )}
                            {r.realHourlyRate !== null && `${formatMoney(r.realHourlyRate)}/hr`}
                          </span>
                        )}
                        {gig.is_union && <span className="text-xs text-stone-500">Union</span>}
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

      <Tour start={!result.tourDone || tour === "1"} hasGigs={all.length > 0} replay={tour === "1"} />

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-stone-50 via-stone-50 to-transparent px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8 lg:left-80">
        <Link
          href="/gigs/new"
          data-tour="new-gig"
          className="btn-primary mx-auto block max-w-md text-center text-lg shadow-lg"
        >
          + New gig
        </Link>
      </div>
    </main>
  );
}
