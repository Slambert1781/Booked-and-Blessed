import Link from "next/link";
import { ClientForm } from "@/components/ClientForm";
import { relationshipSettingsFrom } from "@/lib/clients";
import { getProfile } from "@/lib/profile";

export default async function NewClientPage() {
  const me = await getProfile();
  const rel = relationshipSettingsFrom(me?.profile);
  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6">
      <Link href="/clients" className="text-sm text-indigo-700">
        ← Clients
      </Link>
      <h1 className="mb-6 mt-2 text-2xl font-semibold">New client</h1>
      <ClientForm discounts={rel.discounts} minHourlyRate={rel.minHourlyRate} />
    </main>
  );
}
