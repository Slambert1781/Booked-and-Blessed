"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppNav() {
  const path = usePathname();
  const item = (href: string, label: string, active: boolean, tour?: string) => (
    <Link
      href={href}
      data-tour={tour}
      className={`block rounded-lg px-3 py-2.5 font-medium ${active ? "bg-indigo-50 text-indigo-800" : "text-stone-700 active:bg-stone-100"}`}
    >
      {label}
    </Link>
  );
  return (
    <nav className="space-y-1">
      {item("/", "Your gigs", path === "/" || (path.startsWith("/gigs/") && path !== "/gigs/new"))}
      {item("/calendar", "Calendar", path.startsWith("/calendar"), "calendar")}
      {item("/clients", "Clients", path.startsWith("/clients"), "clients")}
      {item("/gigs/new", "+ New gig", path === "/gigs/new")}
      {item("/?tour=1", "How it works", false)}
      <form action="/auth/sign-out" method="post">
        <button className="block w-full rounded-lg px-3 py-2.5 text-left text-stone-500 active:bg-stone-100">
          Sign out
        </button>
      </form>
    </nav>
  );
}
