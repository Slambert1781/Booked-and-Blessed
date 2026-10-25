import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { Avatar } from "@/components/Avatar";
import { MobileDrawer } from "@/components/MobileDrawer";
import { ProfileTile } from "@/components/ProfileTile";
import { getProfile } from "@/lib/profile";
import { isProfileComplete } from "@/lib/types";

// Signed-in screens: profile tile and menu down the left on wide screens,
// in a slide-out panel on phones. Hidden during first-time profile setup.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await getProfile();
  if (!me) redirect("/sign-in");
  if (!isProfileComplete(me.profile)) return children;

  const panel = (
    <div className="space-y-4">
      <ProfileTile me={me} />
      <AppNav />
    </div>
  );

  return (
    <div className="lg:flex">
      <MobileDrawer avatar={<Avatar url={me.avatarUrl} name={me.name} email={me.email} size={40} />}>{panel}</MobileDrawer>
      <aside className="hidden lg:sticky lg:top-0 lg:block lg:h-dvh lg:w-80 lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-stone-200 lg:px-5 lg:py-6">
        <p className="mb-4 px-1 text-lg font-semibold">Booked and Blessed</p>
        {panel}
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
