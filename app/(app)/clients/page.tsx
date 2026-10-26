import Link from "next/link";
import { TierBadge } from "@/components/TierBadge";
import { KIND_LABEL, type ClientRow } from "@/lib/clients";
import { bookedTotalsByYear } from "@/lib/clientStats";
import { formatMoney } from "@/lib/format";
import { settingsFrom, type GigRow, type ServiceRow } from "@/lib/gigs";
import { getProfile } from "@/lib/profile";
import { TIERS } from "@/lib/relationships";
import { createClient } from "@/lib/supabase/server";

type GigWithServices = GigRow & { gig_services: ServiceRow[] };

export default async function ClientsPage() {
  const me = await getProfile();
  const settings = settingsFrom(me?.profile);
  const supabase = await createClient();
  const [{ data: clients, error }, { data: gigs }] = await Promise.all([
    supabase.from("clients").select("*").returns<ClientRow[]>(),
    supabase.from("gigs").select("*, gig_services(*)").not("client_id", "is", null).returns<GigWithServices[]>(),
  ]);

  const year = new Date().getFullYear();
  const thisYear = new Map(
    (clients ?? []).map((c) => {
      const totals = bookedTotalsByYear(
        (gigs ?? []).filter((g) => g.client_id === c.id),
        settings,
      );
      return [c.id, totals.find((t) => t.year === year) ?? null];
    }),
  );
  // Closest relationships first, then A–Z.
  const sorted = [...(clients ?? [])].sort(
    (a, b) => TIERS.indexOf(b.tier) - TIERS.indexOf(a.tier) || a.name.localeCompare(b.name),
  );

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-6">
      <h1 className="text-2xl font-semibold">Clients</h1>
      <p className="mt-1 text-sm text-stone-600">
        Orchestras, churches, contractors and couples who book you. Closer relationships lower your minimum rate for
        their gigs.
      </p>

      {error ? (
        <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          The database needs the client directory update before clients can be added (the clients SQL script).
        </p>
      ) : sorted.length === 0 ? (
        <div className="mt-8 rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="font-medium">No clients yet</p>
          <p className="mt-1 text-sm text-stone-600">
            Add one here, or pick &quot;+ New client&quot; when you enter a gig.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {sorted.map((c) => {
            const t = thisYear.get(c.id);
            return (
              <li key={c.id}>
                <Link href={`/clients/${c.id}`} className="block rounded-2xl bg-white p-4 shadow-sm active:bg-stone-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{c.name}</p>
                      <p className="text-sm text-stone-500">{KIND_LABEL[c.kind]}</p>
                    </div>
                    <TierBadge tier={c.tier} />
                  </div>
                  <p className="mt-2 text-sm text-stone-600">
                    {t ? (
                      <>
                        {year}: <strong className="tabular-nums">{formatMoney(t.pay)}</strong> across {t.services}{" "}
                        {t.services === 1 ? "service" : "services"}
                      </>
                    ) : (
                      <span className="text-stone-400">No booked gigs in {year} yet</span>
                    )}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-stone-50 via-stone-50 to-transparent px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8 lg:left-80">
        <Link href="/clients/new" className="btn-primary mx-auto block max-w-md text-center text-lg shadow-lg">
          + Add client
        </Link>
      </div>
    </main>
  );
}
