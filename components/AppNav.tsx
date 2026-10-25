"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppNav() {
  const path = usePathname();
  const item = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      className={`block rounded-lg px-3 py-2.5 font-medium ${active ? "bg-indigo-50 text-indigo-800" : "text-stone-700 active:bg-stone-100"}`}
    >
      {label}
    </Link>
  );
  return (
    <nav className="space-y-1">
      {item("/", "Your gigs", path === "/" || (path.startsWith("/gigs/") && path !== "/gigs/new"))}
      {item("/gigs/new", "+ New gig", path === "/gigs/new")}
      <form action="/auth/sign-out" method="post">
        <button className="block w-full rounded-lg px-3 py-2.5 text-left text-stone-500 active:bg-stone-100">
          Sign out
        </button>
      </form>
    </nav>
  );
}
