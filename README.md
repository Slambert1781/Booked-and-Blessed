# Booked and Blessed

A mobile-first web app for freelance classical musicians that shows what a gig
really pays once travel is taken out: gas, drive time, lodging, and any
mileage or lodging money the orchestra pays back.

Built with Next.js (App Router), TypeScript, Tailwind CSS and Supabase, and
deployed on Vercel.

## How it fits together

| Piece | Where |
| --- | --- |
| The gig maths (pure, unit tested) | `lib/calculateGig.ts` |
| Car menus and MPG (fueleconomy.gov, no key) | `lib/fueleconomy.ts`, `app/api/vehicles` |
| Gas prices (EIA, cached in Supabase for a day) | `lib/eia/` |
| Distance and drive time (Google Routes) | `lib/google/routes.ts` |
| Address search (Google Places) | `lib/google/places.ts`, `app/api/places` |
| Database schema and security rules | `supabase/migrations/` |

Every outside API is called from server code only, so API keys never reach the
browser.

## Environment variables

Copy `.env.example` to `.env.local` for local development. Put the same values
in Vercel → your project → Settings → Environment Variables (tick Production
and Preview).

| Variable | Where to get it | Secret? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` `public` key | No (protected by Row Level Security) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` key | **Yes.** Only used server-side to write the shared gas price cache |
| `EIA_API_KEY` | Free at https://www.eia.gov/opendata/register.php | Yes |
| `GOOGLE_MAPS_API_KEY` | Google Cloud Console (see below) | Yes |
| `NEXT_PUBLIC_SITE_URL` | Your live URL, e.g. `https://booked-and-blessed.vercel.app` | No |

Never commit `.env.local`. It's already in `.gitignore`.

## One-time setup

### 1. Supabase

1. **Create the tables.** Supabase → SQL Editor → New query. Run **every**
   file in `supabase/migrations/`, one at a time, **oldest first** (the file
   names start with the date, so alphabetical order is the right order). Each
   one is safe to run twice.
2. **Allow the app's addresses.** Authentication → URL Configuration:
   - **Site URL:** your live Vercel URL, e.g. `https://booked-and-blessed.vercel.app`
   - **Redirect URLs:** add
     - `http://localhost:3000/**`
     - `https://booked-and-blessed.vercel.app/**`
     - `https://*-<your-vercel-team>.vercel.app/**` (preview deploys)
3. **Make sign-in links work across devices.** Authentication → Email
   Templates → Magic Link. Replace the link in the template with:

   ```html
   <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">Sign in to Booked and Blessed</a>
   ```

   Without this, a link only works in the browser that requested it. So
   requesting a link on a laptop and opening the email on a phone would fail.
4. **Email limits.** Supabase's built-in email sends only a few messages per
   hour. That's fine for a handful of people, but if you hit the limit while
   testing, add a free SMTP provider (e.g. Resend) under Authentication →
   SMTP Settings.

### 2. Google Maps Platform

1. In https://console.cloud.google.com, create a project and add billing.
   The monthly free credit easily covers personal use.
2. APIs & Services → Library: enable **Routes API** and **Places API (New)**.
3. APIs & Services → Credentials → Create credentials → API key.
4. Edit the key → API restrictions → Restrict key → choose only Routes API
   and Places API (New). Leave Application restrictions as "None": the key
   is only used from the server, never the browser.
5. Optional but sensible: Billing → Budgets & alerts → set a small monthly
   budget alert.

### 3. EIA

Register at https://www.eia.gov/opendata/register.php. The key arrives by email.

### 4. Vercel

1. In Vercel: Add New → Project → import the `booked-and-blessed` GitHub repo.
   The defaults are correct for Next.js.
2. Before the first deploy, add the environment variables above.
3. Deploy. From then on, every push to `main` updates the live site, and every
   pull request gets its own preview link.

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev                  # http://localhost:3000
```

Other commands:

```bash
npm test           # unit tests (calculateGig and the gas price mapping)
npm run lint
npm run typecheck
npm run build
```

## If a lookup fails

The app never gets stuck on an outside service:

- **No route found / Google unavailable:** type the miles and minutes each way.
- **EIA unavailable:** the last cached price is used if there is one, or you
  type in the gas price.
- **fueleconomy.gov unavailable:** tick "Type in my own MPG instead".

Each saved gig stores its distance, drive time, gas price (and where it came
from) plus the MPG and hourly rates used. A saved result never changes later.

## Gas price sources

EIA publishes weekly retail regular gasoline prices. California, Colorado,
Florida, Massachusetts, Minnesota, New York, Ohio, Texas and Washington have
their own state series. Every other state uses its regional average: PADD 1 is
split into New England, Central Atlantic and Lower Atlantic, and West Coast
states other than California use "West Coast except California". The U.S.
average is the last fallback. See `lib/eia/stateSeries.ts`.
