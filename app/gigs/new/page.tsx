import Link from "next/link";
import { redirect } from "next/navigation";
import { getGasPrice, type GasPrice } from "@/lib/eia/gasPrice";
import { getProfile } from "@/lib/profile";
import { isProfileComplete, num } from "@/lib/types";
import { GigForm } from "./GigForm";

export default async function NewGigPage() {
  const result = await getProfile();
  if (!result) redirect("/sign-in");
  if (!isProfileComplete(result.profile)) redirect("/profile");
  const p = result.profile!;

  let gas: GasPrice | null = null;
  try {
    gas = await getGasPrice(p.home_state);
  } catch {
    gas = null;
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6">
      <Link href="/" className="text-sm text-indigo-700">
        ← Gigs
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">New gig</h1>
      <GigForm
        profile={{ mpg: num(p.mpg)!, playingRate: num(p.playing_rate)!, drivingRate: num(p.driving_rate) }}
        gas={gas}
      />
    </main>
  );
}
