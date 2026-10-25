import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ResultBreakdown } from "@/components/ResultBreakdown";
import { formatDate, formatMiles, formatMoney, formatTime } from "@/lib/format";
import { resultForSavedGig, statusOf, type GigRow, type ServiceRow } from "@/lib/gigs";
import { createClient } from "@/lib/supabase/server";
import { num } from "@/lib/types";
import { deleteGig } from "./actions";
import { DecisionButtons } from "./DecisionButtons";

export default async function GigResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: gig } = await supabase.from("gigs").select("*").eq("id", id).maybeSingle<GigRow>();
  if (!gig) notFound();
  const { data: services } = await supabase
    .from("gig_services")
    .select("id, service_date, start_time")
    .eq("gig_id", id)
    .order("service_date")
    .order("start_time", { nullsFirst: true })
    .returns<ServiceRow[]>();

  const result = resultForSavedGig(gig, services ?? []);
  const gasPrice = num(gig.gas_price) ?? 0;

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6">
      <Link href="/" className="text-sm text-indigo-700">
        ← Gigs
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{gig.title || gig.venue_address}</h1>
      {gig.title && <p className="text-stone-600">{gig.venue_address}</p>}
      <p className="mt-1 text-sm text-stone-500">
        {gig.gig_type === "orchestra"
          ? `Orchestra · ${gig.number_of_services} services at ${formatMoney(num(gig.fee_per_service) ?? 0)}`
          : "Flat fee"}
      </p>

      <div className="mt-6">
        <ResultBreakdown result={result} />
      </div>

      <section className="mt-6">
        <DecisionButtons gigId={gig.id} status={statusOf(gig)} />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Schedule</h2>
        <ul className="mt-2 divide-y divide-stone-200 rounded-2xl bg-white px-4 shadow-sm">
          {(services ?? []).map((s) => (
            <li key={s.id} className="flex justify-between py-3">
              <span>{formatDate(s.service_date)}</span>
              <span className="text-stone-600">{formatTime(s.start_time)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 space-y-1 text-sm text-stone-600">
        <h2 className="text-lg font-semibold text-stone-900">How this was worked out</h2>
        <p>
          {formatMiles(num(gig.one_way_miles) ?? 0)} and {Math.round(num(gig.one_way_minutes) ?? 0)} min each way
          {gig.distance_is_manual ? " (entered by hand)" : " (Google Maps)"}.
        </p>
        <p>
          Gas at ${gasPrice.toFixed(3)}/gal: {gig.gas_price_source ?? "entered by hand"}
          {gig.gas_price_date && `, week of ${formatDate(gig.gas_price_date, { weekday: undefined, year: "numeric" })} (U.S. EIA)`}.
        </p>
        <p>
          Car at {num(gig.mpg_used)} MPG. Drive time valued at {formatMoney(result.driveTimeRate)}/hr.
        </p>
        <p className="pt-1 text-xs text-stone-500">
          These numbers are saved with the gig, so the result won&apos;t change when gas prices or your profile do.
        </p>
      </section>

      <form action={deleteGig.bind(null, gig.id)} className="mt-10">
        <button className="w-full rounded-lg py-3 text-red-700 active:bg-red-50">Delete this gig</button>
      </form>
    </main>
  );
}
