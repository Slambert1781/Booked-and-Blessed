import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { TierBadge } from "@/components/TierBadge";
import { KIND_LABEL, relationshipSettingsFrom } from "@/lib/clients";
import { getClient } from "@/lib/clientsServer";
import { bookedTotalsByYear } from "@/lib/clientStats";
import { formatDateRange, formatMoney } from "@/lib/format";
import { gigName, isPlayed, resultForSavedGig, settingsFrom, statusOf, type GigRow, type ServiceRow } from "@/lib/gigs";
import { todayISO } from "@/lib/today";
import { getProfile } from "@/lib/profile";
import { rushTier, TIER_LABEL } from "@/lib/relationships";
import { createClient } from "@/lib/supabase/server";
import { DeleteClient } from "./DeleteClient";
import { EditClient } from "./EditClient";

type GigWithServices = GigRow & { gig_services: ServiceRow[] };

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [client, me] = await Promise.all([getClient(id), getProfile()]);
  if (!client) notFound();

  const settings = settingsFrom(me?.profile);
  const rel = relationshipSettingsFrom(me?.profile);
  const supabase = await createClient();
  const { data } = await supabase
    .from("gigs")
    .select("*, gig_services(*)")
    .eq("client_id", id)
    .returns<GigWithServices[]>();
  const gigs = (data ?? []).sort((a, b) =>
    (b.gig_services.map((s) => s.service_date).sort()[0] ?? "").localeCompare(
      a.gig_services.map((s) => s.service_date).sort()[0] ?? "",
    ),
  );
  const years = bookedTotalsByYear(gigs, settings);
  const counts = { taken: 0, undecided: 0, declined: 0 };
  for (const g of gigs) counts[statusOf(g)]++;
  const discount = rel.discounts[client.tier];
  const today = todayISO();

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6">
      <Link href="/clients" className="text-sm text-indigo-700">
        ← Clients
      </Link>
      <div className="mt-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">{client.name}</h1>
          <p className="text-stone-600">{KIND_LABEL[client.kind]}</p>
        </div>
        <TierBadge tier={client.tier} />
      </div>

      <p className="mt-3 rounded-xl bg-white p-3 text-sm text-stone-700 shadow-sm">
        As <strong>{TIER_LABEL[client.tier]}</strong>, gigs for {client.name} get{" "}
        <strong>{discount}% off</strong> your minimum hourly rate
        {rel.minHourlyRate !== null && (
          <>
            {" "}
            ({formatMoney(rel.minHourlyRate)} → <strong>{formatMoney(rel.minHourlyRate * (1 - discount / 100))}/hr</strong>)
          </>
        )}
        {discount > 0 && rel.rushEnabled && rel.rushPeriods.length > 0 && (
          <>
            . During Holiday Rush they count as {TIER_LABEL[rushTier(client.tier)]} (
            {rel.discounts[rushTier(client.tier)]}% off)
          </>
        )}
        .
      </p>
      {client.notes && <p className="mt-3 whitespace-pre-wrap text-sm text-stone-600">{client.notes}</p>}

      <section className="mt-6">
        <h2 className="text-lg font-semibold">What they&apos;re worth</h2>
        {years.length === 0 ? (
          <p className="mt-2 text-sm text-stone-500">No booked gigs yet. Book one and it&apos;ll show up here.</p>
        ) : (
          <ul className="mt-2 divide-y divide-stone-200 rounded-2xl bg-white px-4 shadow-sm">
            {years.map((y) => (
              <li key={y.year} className="py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold">{y.year}</span>
                  <span className="text-lg font-bold tabular-nums text-indigo-700">{formatMoney(y.pay)}</span>
                </div>
                <p className="text-sm text-stone-600">
                  across {y.services} {y.services === 1 ? "service" : "services"} in {y.gigs}{" "}
                  {y.gigs === 1 ? "gig" : "gigs"} · {formatMoney(y.takeHome)} take-home after travel
                </p>
              </li>
            ))}
          </ul>
        )}
        {gigs.length > 0 && (
          <p className="mt-2 text-xs text-stone-500">
            {counts.taken} booked · {counts.undecided} undecided · {counts.declined} declined
          </p>
        )}
      </section>

      {gigs.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Gigs</h2>
          <ul className="mt-2 space-y-2">
            {gigs.map((g) => {
              const r = resultForSavedGig(g, g.gig_services, settings);
              return (
                <li key={g.id}>
                  <Link
                    href={`/gigs/${g.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-sm active:bg-stone-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{/* Every gig here is this client's, so name them by title, then venue. */}
                        {gigName(g, null, g.gig_services)}</span>
                      <span className="block text-sm text-stone-500">
                        {formatDateRange(g.gig_services.map((s) => s.service_date))}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-semibold tabular-nums">{formatMoney(r.realTakeHome)}</span>
                      <StatusBadge status={statusOf(g)} played={isPlayed(g, g.gig_services, today)} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mt-8 space-y-3">
        <EditClient client={client} discounts={rel.discounts} minHourlyRate={rel.minHourlyRate} />
        <DeleteClient id={client.id} name={client.name} gigCount={gigs.length} />
      </section>
    </main>
  );
}
