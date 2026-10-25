import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Home screen. Placeholder until the gig list is built.
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-2xl font-semibold">Booked and Blessed</h1>
      <p className="mt-2 text-stone-600">Signed in as {user.email}</p>
      <form action="/auth/sign-out" method="post" className="mt-6">
        <button className="btn-secondary">Sign out</button>
      </form>
    </main>
  );
}
