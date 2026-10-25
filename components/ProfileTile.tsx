import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { formatMoney } from "@/lib/format";
import type { Me } from "@/lib/profile";
import { num } from "@/lib/types";

/** "123 Main St, Philomath, OR 97370, USA" -> "Philomath, OR" */
function shortPlace(address: string | null, state: string | null) {
  if (!address) return state ?? "";
  const parts = address.split(",").map((p) => p.trim()).filter((p) => p && p !== "USA");
  if (parts.length >= 3) return `${parts.at(-2)}, ${parts.at(-1)!.replace(/\s*\d{5}(-\d{4})?$/, "")}`;
  return address;
}

export function ProfileTile({ me }: { me: Me }) {
  const p = me.profile;
  const car = [p?.vehicle_year, p?.vehicle_make, p?.vehicle_model].filter(Boolean).join(" ");
  const mpg = num(p?.mpg ?? null);
  const playing = num(p?.playing_rate ?? null);
  const driving = num(p?.driving_rate ?? null);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Avatar url={me.avatarUrl} name={me.name} email={me.email} size={48} />
        <div className="min-w-0">
          <p className="truncate font-semibold">{me.name || "Your profile"}</p>
          <p className="truncate text-sm text-stone-500">{me.email}</p>
        </div>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <Item label="Home" value={shortPlace(p?.home_address ?? null, p?.home_state ?? null)} />
        <Item
          label="Car"
          value={[car || (p?.mpg_is_manual ? "Your vehicle" : ""), mpg !== null ? `${mpg} MPG` : ""]
            .filter(Boolean)
            .join(" · ")}
        />
        <Item label="Playing" value={playing !== null ? `${formatMoney(playing)}/hr` : ""} />
        <Item
          label="Driving"
          value={driving !== null ? `${formatMoney(driving)}/hr` : "Same as playing"}
        />
      </dl>

      <Link href="/profile" className="btn-secondary mt-4 block py-2 text-center text-sm">
        Edit profile
      </Link>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-stone-500">{label}</dt>
      <dd className="truncate text-right font-medium">{value || "—"}</dd>
    </div>
  );
}
