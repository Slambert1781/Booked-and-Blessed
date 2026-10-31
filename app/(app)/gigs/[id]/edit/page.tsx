import Link from "next/link";
import { notFound } from "next/navigation";
import { getGasPrice, type GasPrice } from "@/lib/eia/gasPrice";
import { relationshipSettingsFrom } from "@/lib/clients";
import { listClients } from "@/lib/clientsServer";
import { gigToFormValues } from "@/lib/gigForm";
import { gigName, settingsFrom } from "@/lib/gigs";
import { loadGig } from "@/lib/loadGig";
import { getProfile } from "@/lib/profile";
import { mealRatesFromProfile, parseMealRates } from "@/lib/meals";
import { num } from "@/lib/types";
import { DeleteGigButton } from "@/components/DeleteGigButton";
import { GigForm } from "../../new/GigForm";

export default async function EditGigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [loaded, me, clients] = await Promise.all([loadGig(id), getProfile(), listClients()]);
  if (!loaded) notFound();
  const { gig, services } = loaded;

  let gas: GasPrice | null = null;
  try {
    gas = await getGasPrice(me?.profile?.home_state ?? null);
  } catch {
    gas = null;
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6">
      <Link href={`/gigs/${id}`} className="text-sm text-indigo-700">
        ← Back to gig
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">Edit gig</h1>
      <p className="mt-1 text-sm text-stone-600">
        Change anything: pay, dates, venue or extras. It&apos;s still worked out with the car and rates you had
        when you first saved it.
      </p>
      <GigForm
        // Saved gigs keep the MPG and hourly rates they were first worked out with.
        profile={{
          mpg: num(gig.mpg_used) ?? 0,
          playingRate: num(gig.playing_rate_used) ?? 0,
          drivingRate: num(gig.driving_rate_used),
          // The gig's own meal prices; older gigs take today's profile prices when edited.
          mealRates: parseMealRates(gig.meal_rates_used) ?? mealRatesFromProfile(me?.profile),
          ...settingsFrom(me?.profile),
        }}
        defaultServiceHours={num(me?.profile?.default_service_hours ?? null) ?? undefined}
        clients={clients}
        relationship={relationshipSettingsFrom(me?.profile)}
        gas={gas}
        initial={gigToFormValues(gig, services, "edit")}
        mode={{ kind: "edit", gigId: id }}
      />
      <div className="mt-10 border-t border-stone-200 pt-4">
        <DeleteGigButton
          gigId={id}
          name={gigName(gig, clients.find((c) => c.id === gig.client_id)?.name, services)}
        />
      </div>
    </main>
  );
}
