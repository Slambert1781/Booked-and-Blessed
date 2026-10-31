import Link from "next/link";

// The full how-to guide. The walkthrough (?tour=1) points at things on the
// home screen; this page explains every feature in more depth.

type Section = { id: string; title: string; body: React.ReactNode };

const SECTIONS: Section[] = [
  {
    id: "start",
    title: "Getting started",
    body: (
      <>
        <p>
          Booked and Blessed shows what a gig <strong>really</strong> pays once travel is taken out: gas, the time
          you spend driving, food and hotels, plus anything the employer pays back.
        </p>
        <ol>
          <li>
            <strong>Set up your profile once</strong> (see <a href="#profile">Your profile</a>): home address, car,
            hourly rates and meal prices.
          </li>
          <li>
            <strong>Enter each gig</strong> you&apos;re offered with <strong>+ New gig</strong>.
          </li>
          <li>
            <strong>Decide</strong>: the app shows your real take-home and whether the gig is worth it.
          </li>
        </ol>
        <p>
          <strong>Put it on your home screen</strong> so it opens like an app. On iPhone, open it in Safari and tap{" "}
          <strong>Share → Add to Home Screen</strong>. On Android, open it in Chrome and tap{" "}
          <strong>⋮ → Add to Home screen</strong>.
        </p>
      </>
    ),
  },
  {
    id: "new-gig",
    title: "Entering a gig",
    body: (
      <>
        <ul>
          <li>
            <strong>Client</strong> (first, and required): start typing the orchestra, church, contractor or
            couple. Pick them from the list and their usual venue, pay and mileage and lodging terms fill in from
            their last gig; change anything that&apos;s different. Someone new? Tap{" "}
            <strong>Add &lsquo;name&rsquo; as a new client</strong> and pick their relationship tier; they&apos;re
            added when you save. The tier affects the verdict (see <a href="#clients">Clients</a>).
          </li>
          <li>
            <strong>How are you paid?</strong> <strong>Per service</strong> means a fee for each rehearsal and
            performance (the app shows the sum, e.g. 5 × $150 = $750). <strong>One fee</strong> is a single
            payment for the whole gig.
          </li>
          <li>
            <strong>Venue</strong> (required): start typing and <strong>pick it from the suggestions</strong>. The
            drive is worked out from Google Maps.
          </li>
          <li>
            <strong>Rehearsals and performances</strong>: add one row for each. Choose Rehearsal or Performance,
            set the date, and set <strong>hrs</strong> (how long it lasts; used for your hourly rate). The start
            time is optional and only shows on your calendar.
          </li>
          <li>
            <strong>See the assumptions</strong>: tap to check or change what the gig is worked out with: miles and
            minutes each way (with the two addresses Google used), the gas price (this week&apos;s average for your
            state or region, with its date) and your car&apos;s MPG. It opens by itself if something there needs
            filling in.
          </li>
        </ul>
        <p>Anything you&apos;ve missed is highlighted in red when you tap Save.</p>
      </>
    ),
  },
  {
    id: "extras",
    title: "Extras: union, mileage, hotels, food and drive time",
    body: (
      <ul>
        <li>
          <strong>Union gig</strong>: add the pension % the employer pays. It&apos;s shown as a separate{" "}
          <strong>+ union pension</strong> line, not in your take-home, but it does count when judging whether the
          gig is worth it.
        </li>
        <li>
          <strong>They pay mileage</strong>: per mile or a flat amount. Added to your take-home.
        </li>
        <li>
          <strong>I&apos;m staying overnight</strong>: one round trip instead of one per day. Set the number of
          nights (it fills in from your dates), the room cost, or <strong>Hosted</strong> if the room is free, and
          any lodging stipend.
        </li>
        <li>
          <strong>Don&apos;t charge my drive time</strong>: normally the hours you spend driving count as part of
          your time, at your driving rate. Turn this on for a gig where you don&apos;t mind the drive; gas still
          counts.
        </li>
        <li>
          <strong>Eating out</strong> (on unless you turn it off): tick which meals you&apos;ll buy each day.
          Locally it starts with dinner; overnight, all four. Food = days × the ticked meals, at the prices in your
          profile.
        </li>
        <li>
          <strong>They pay a food stipend</strong>: per day or a flat amount, added to your take-home. It counts
          even if you bring your own food.
        </li>
      </ul>
    ),
  },
  {
    id: "result",
    title: "Reading the result",
    body: (
      <>
        <ul>
          <li>
            <strong>Your real take-home</strong> (the big number): the cash you keep. The pay plus anything they pay
            back, minus gas, hotels, food and the taxes to set aside.
          </li>
          <li>
            <strong>What your time is worth</strong>: your playing hours at your minimum hourly rate for this client
            (after any relationship discount), plus your driving hours at your driving rate. It needs the{" "}
            <strong>hrs</strong> for each rehearsal and performance.
          </li>
          <li>
            <strong>The colour</strong> compares your take-home with what your time is worth:
            <span className="mt-1 block">
              <Dot c="bg-emerald-500" /> <strong>Green, worth it</strong>: your take-home covers your time.
            </span>
            <span className="block">
              <Dot c="bg-amber-400" /> <strong>Yellow, a close call</strong>: short by no more than 15%.
            </span>
            <span className="block">
              <Dot c="bg-red-500" /> <strong>Red, not worth it</strong>: shorter than that, or you&apos;d take home
              nothing at all.
            </span>
            The app explains each colour in a sentence underneath.
          </li>
          <li>
            The breakdown lists every amount, so you can see where the money goes. Your{" "}
            <strong>real hourly rate</strong> is shown too, for information.
          </li>
        </ul>
        <p className="rounded-xl bg-stone-50 p-3">
          <strong>Example:</strong> a $400 wedding, 48 miles away. Gas $17, dinner $28, 25% tax ($100): take-home{" "}
          <strong>$255</strong>. Your time: 2 hr 30 min of playing at $40 ($100) plus 1 hr 50 min of driving at $25
          ($46) is worth $146, so it&apos;s green: $109 more than your time is worth.
        </p>
      </>
    ),
  },
  {
    id: "decide",
    title: "Deciding, and your calendar",
    body: (
      <ul>
        <li>
          Choose <strong>Book it</strong>, <strong>Decline</strong> or <strong>Undecided</strong> when you save a
          gig, or later on its page (then tap <strong>Save decision</strong>).
        </li>
        <li>
          <strong>Your gigs</strong> has tabs for All, Undecided, Booked and Declined. Each gig shows its take-home,
          hourly rate and colour.
        </li>
        <li>
          <strong>Calendar</strong> (in the menu) shows every rehearsal and performance of the gigs you&apos;ve
          booked, with each month&apos;s take-home and tax to set aside.
        </li>
        <li>
          Once a booked gig&apos;s dates have passed, it&apos;s labelled <strong>Played</strong>.
        </li>
      </ul>
    ),
  },
  {
    id: "edit",
    title: "Editing and copying gigs",
    body: (
      <ul>
        <li>
          <strong>Edit gig</strong> (on the gig&apos;s page): change anything, including the pay. A saved gig keeps
          the car, rates and meal prices it was first worked out with, so changing your profile never alters old
          results.
        </li>
        <li>
          <strong>Make a copy</strong>: for a gig that comes round again, like the same church every Christmas.
          Everything is filled in; give it a new name, change the dates and check the pay.
        </li>
        <li>
          <strong>Delete this gig</strong> is at the bottom of the gig&apos;s page and of the edit page.
        </li>
      </ul>
    ),
  },
  {
    id: "past",
    title: "Past gigs and actual costs",
    body: (
      <ul>
        <li>
          <strong>Logging a gig you&apos;ve already played</strong>: in New gig, turn on{" "}
          <strong>Already played</strong>. It&apos;s saved as booked, and the gas price is that week&apos;s
          average.
        </li>
        <li>
          <strong>What it actually paid and cost</strong>: enter the real pay received, gas, food and lodging. Each
          box shows the estimate in grey; leave it blank to keep the estimate.
        </li>
        <li>
          For a booked gig that has now happened, its page asks you to enter the actual figures. The result then
          marks those lines <strong>actual</strong>, and <strong>Compare with your estimate</strong> shows what you
          expected next to what really happened.
        </li>
      </ul>
    ),
  },
  {
    id: "clients",
    title: "Clients and relationship tiers",
    body: (
      <>
        <p>
          Not every gig is only about the money. An orchestra that hires you every season is worth keeping happy even
          when one gig pays a little less. Give each client a tier in <strong>Clients</strong>; closer relationships
          lower your minimum hourly rate for their gigs:
        </p>
        <ul>
          <li>
            <strong>New Face</strong> (a stranger&apos;s wedding): 0% off
          </li>
          <li>
            <strong>Familiar</strong> (a church that calls twice a year): 10% off
          </li>
          <li>
            <strong>Faithful</strong> (a contractor who sends steady work): 20% off
          </li>
          <li>
            <strong>Favored</strong> (an orchestra that hires you every season): 30% off
          </li>
          <li>
            <strong>Highly Favored</strong> (your main orchestra or best contractor): 40% off
          </li>
        </ul>
        <p>
          With a $40 minimum, a $400 concert set that leaves you $280 for 8 hours of playing and 3 of driving is red
          for a New Face (your time is worth $395) but green for a Highly Favored client (minimum $24, time worth
          $267).
        </p>
        <ul>
          <li>
            <strong>Holiday Rush</strong> (Oct 1 – Dec 31 unless you change it): every client counts as one tier
            lower, because every date is precious.
          </li>
          <li>A gig that leaves you nothing after costs and taxes is always red, whatever the tier.</li>
          <li>Each client&apos;s page shows what their booked gigs were worth each year.</li>
        </ul>
      </>
    ),
  },
  {
    id: "profile",
    title: "Your profile",
    body: (
      <ul>
        <li>
          <strong>Home address</strong>: <strong>pick it from the suggestions</strong> so every drive starts from
          the right place.
        </li>
        <li>
          <strong>Car</strong>: choose the year, make and model; the MPG is the average for that model. Or type
          your own MPG, e.g. for a van loaded with gear.
        </li>
        <li>
          <strong>Playing rate</strong> and an optional <strong>driving rate</strong> (what your time behind the
          wheel is worth; blank = your playing rate).
        </li>
        <li>
          <strong>Minimum real hourly rate</strong> (for the colours), <strong>tax set-aside %</strong>, and a{" "}
          <strong>typical rehearsal or concert length</strong>.
        </li>
        <li>
          <strong>Food</strong>: breakfast, lunch, dinner and incidentals prices. They start at the federal per
          diem ($16, $19, $28, $5); change them to what you really spend.
        </li>
        <li>
          <strong>Relationship tiers</strong> and <strong>Holiday Rush</strong> dates can be adjusted too.
        </li>
      </ul>
    ),
  },
];

function Dot({ c }: { c: string }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full align-middle ${c}`} />;
}

export default function GuidePage() {
  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6 lg:max-w-2xl">
      <h1 className="text-2xl font-semibold">How it works</h1>
      <p className="mt-1 text-stone-600">Tap a topic to open it.</p>

      <Link href="/?tour=1" className="btn-secondary mt-4 block py-2 text-center text-sm">
        Replay the quick tour
      </Link>

      <nav className="mt-6 space-y-3">
        {SECTIONS.map((s, i) => (
          <details
            key={s.id}
            id={s.id}
            open={i === 0}
            className="group scroll-mt-20 rounded-2xl bg-white px-4 py-3 shadow-sm"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
              {s.title}
              <span className="text-stone-400 transition-transform group-open:rotate-90">›</span>
            </summary>
            <div className="guide mt-3 space-y-3 text-[15px] leading-relaxed text-stone-700">{s.body}</div>
          </details>
        ))}
      </nav>
    </main>
  );
}
