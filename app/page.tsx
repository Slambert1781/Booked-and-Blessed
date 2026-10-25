import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import { isProfileComplete } from "@/lib/types";

// Home screen. Placeholder until the gig list is built.
export default async function Home() {
  const result = await getProfile();
  if (!result) redirect("/sign-in");
  if (!isProfileComplete(result.profile)) redirect("/profile");

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-2xl font-semibold">Booked and Blessed</h1>
      <form action="/auth/sign-out" method="post" className="mt-6">
        <button className="btn-secondary">Sign out</button>
      </form>
    </main>
  );
}
