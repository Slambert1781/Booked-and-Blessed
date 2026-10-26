import Link from "next/link";
import { redirect } from "next/navigation";
import { getGasPrice, type GasPrice } from "@/lib/eia/gasPrice";
import { relationshipSettingsFrom } from "@/lib/clients";
import { listClients } from "@/lib/clientsServer";
import { gigToFormValues } from "@/lib/gigForm";
import { settingsFrom } from "@/lib/gigs";
import { loadGig } from "@/lib/loadGig";
import { getProfile } from "@/lib/profile";
import { DEFAULT_LOCAL_MEAL_RATE, DEFAULT_OVERNIGHT_MEAL_RATE, isProfileComplete, num } from "@/lib/types";
import { GigForm } from "./GigForm";

export default async function NewGigPage({ searchParams }: { searchParams: Promise<{ copy?: string }> }) {
  const result = await getProfile();
  if (!result) redirect("/sign-in");
  if (!isProfileComplete(result.profile)) redirect("/profile");
  const p = result.profile!;

  const { copy } = await searchParams;
  const [source, clients] = await Promise.all([copy ? loadGig(copy) : null, listClients()]);

  let gas: GasPrice | null = null;
  try {
    gas = await getGasPrice(p.home_state);
  } catch {
    gas = null;
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6">
      <Link href={source ? `/gigs/${source.gig.id}` : "/"} className="text-sm text-indigo-700">
        ← {source ? "Back to gig" : "Gigs"}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{source ? "Copy of gig" : "New gig"}</h1>
      {source && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Copied from <strong>{source.gig.title || source.gig.venue_address}</strong>. Give it a{" "}
          <strong>new name</strong>, update the <strong>dates</strong> and check the <strong>pay</strong>, since fees
          often change from year to year.
          Today&apos;s gas price and your current car and rates are used.
        </p>
      )}
      <GigForm
        profile={{
          mpg: num(p.mpg)!,
          playingRate: num(p.playing_rate)!,
          drivingRate: num(p.driving_rate),
          localMealRate: num(p.local_meal_rate ?? null) ?? DEFAULT_LOCAL_MEAL_RATE,
          overnightMealRate: num(p.overnight_meal_rate ?? null) ?? DEFAULT_OVERNIGHT_MEAL_RATE,
          ...settingsFrom(p),
        }}
        defaultServiceHours={num(p.default_service_hours ?? null) ?? undefined}
        clients={clients}
        relationship={relationshipSettingsFrom(p)}
        gas={gas}
        initial={source ? gigToFormValues(source.gig, source.services, "copy") : undefined}
        mode={source ? { kind: "copy" } : { kind: "new" }}
        copiedFromTitle={source ? source.gig.title || source.gig.venue_address : undefined}
      />
    </main>
  );
}
