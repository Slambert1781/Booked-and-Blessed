import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDateRange, formatMoney } from "@/lib/format";
import { resultForSavedGig, type GigRow, type ServiceRow } from "@/lib/gigs";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { isProfileComplete } from "@/lib/types";

type GigWithServices = GigRow & { gig_services: ServiceRow[] };

export default async function Home() {
  const result = await getProfile();
  if (!result) redirect("/sign-in");
  if (!isProfileComplete(result.profile)) redirect("/profile");

  const supabase = await createClient();
  const { data: gigs } = await supabase
    .from("gigs")
    .select("*, gig_services(id, service_date, start_time)")
    .order("created_at", { ascending: false })
    .returns<GigWithServices[]>();

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your gigs</h1>
        <Link href="/profile" className="text-sm text-indigo-700">
          Profile
        </Link>
      </header>

      {!gigs?.length ? (
        <div className="mt-10 rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="font-medium">No gigs yet</p>
          <p className="mt-1 text-sm text-stone-600">
            Add one to see what it really pays once travel is counted.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {gigs.map((gig) => {
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

      <form action="/auth/sign-out" method="post" className="mt-10 text-center">
        <button className="text-sm text-stone-500">Sign out</button>
      </form>

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-stone-50 via-stone-50 to-transparent px-4 pb-6 pt-8">
        <Link href="/gigs/new" className="btn-primary mx-auto block max-w-md text-center text-lg shadow-lg">
          + New gig
        </Link>
      </div>
    </main>
  );
}
