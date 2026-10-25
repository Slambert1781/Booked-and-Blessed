"use client";

import { useActionState } from "react";
import { sendMagicLink, type SignInState } from "./actions";

export default function SignInPage() {
  const [state, action, pending] = useActionState<SignInState, FormData>(sendMagicLink, {
    status: "idle",
  });

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
      <h1 className="text-3xl font-semibold">Booked and Blessed</h1>
      <p className="mt-2 text-stone-600">See what a gig really pays once travel is counted.</p>

      {state.status === "sent" ? (
        <div className="mt-8 rounded-xl bg-emerald-50 p-4 text-emerald-900">
          Check <strong>{state.message}</strong> for a sign-in link. You can close this tab.
        </div>
      ) : (
        <form action={action} className="mt-8 space-y-3">
          <label className="block text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="field"
            placeholder="you@example.com"
          />
          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? "Sending…" : "Email me a sign-in link"}
          </button>
          {state.status === "error" && <p className="text-sm text-red-700">{state.message}</p>}
        </form>
      )}
    </main>
  );
}
