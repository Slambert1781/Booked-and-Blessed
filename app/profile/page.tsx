import { redirect } from "next/navigation";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { isProfileComplete } from "@/lib/types";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const result = await getProfile();
  if (!result) redirect("/sign-in");
  const complete = isProfileComplete(result.profile);

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6">
      {complete && (
        <Link href="/" className="text-sm text-indigo-700">
          ← Gigs
        </Link>
      )}
      <h1 className="mt-2 text-2xl font-semibold">{complete ? "Your profile" : "Set up your profile"}</h1>
      {!complete && (
        <p className="mt-1 text-stone-600">
          You only do this once. It&apos;s used to work out travel costs for every gig.
        </p>
      )}
      <ProfileForm profile={result.profile} />
    </main>
  );
}
