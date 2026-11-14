// The celebration badge drawing: a rounded shield with a gradient from the
// app's purple (indigo) to pink, a
// stack of money and a few sparkles. Drawn in code (SVG + CSS), no animation
// files. Decorative only (aria-hidden): the message beside it is the real
// text.
//
// To use a different design (or an animation file) later, replace this
// component; the pop-up only relies on it rendering a square ~160px element.

const SPARKLES = [
  { top: "4%", left: "10%", size: 18, delay: "0ms" },
  { top: "12%", left: "84%", size: 14, delay: "220ms" },
  { top: "70%", left: "-2%", size: 12, delay: "420ms" },
  { top: "78%", left: "90%", size: 16, delay: "140ms" },
];

// Purple to pink. The purple is the app's own (Tailwind's indigo, as on its
// buttons and links).
const FILL_FROM = "[stop-color:var(--color-indigo-600)] dark:[stop-color:var(--color-indigo-700)]";
const FILL_TO = "[stop-color:var(--color-pink-400)] dark:[stop-color:var(--color-pink-600)]";

/** One banknote, drawn at the origin (80 × 40). */
function Bill({ top }: { top?: boolean }) {
  return (
    <g>
      <rect width="80" height="40" rx="5" fill={top ? "url(#celebration-bill)" : "#15803d"} stroke="#ffffff" strokeWidth="2.5" />
      {top && (
        <>
          <rect x="6" y="6" width="68" height="28" rx="3" fill="none" stroke="#dcfce7" strokeOpacity="0.7" strokeWidth="1.5" />
          <circle cx="40" cy="20" r="11" fill="#dcfce7" />
          <text x="40" y="26.5" textAnchor="middle" fontSize="18" fontWeight="800" fill="#166534" fontFamily="system-ui, sans-serif">
            $
          </text>
          <circle cx="15" cy="20" r="3" fill="#dcfce7" fillOpacity="0.7" />
          <circle cx="65" cy="20" r="3" fill="#dcfce7" fillOpacity="0.7" />
        </>
      )}
    </g>
  );
}

/** A small stack of bills: two peeking out underneath, one on top. */
function MoneyStack() {
  return (
    <svg viewBox="0 0 100 80" className="h-[84px] w-[105px] drop-shadow-md">
      <defs>
        <linearGradient id="celebration-bill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
      </defs>
      <g transform="translate(14 32) rotate(6 40 20)">
        <Bill />
      </g>
      <g transform="translate(6 24) rotate(-5 40 20)">
        <Bill />
      </g>
      <g transform="translate(10 12)">
        <Bill top />
      </g>
    </svg>
  );
}

export function CelebrationBadge() {
  return (
    <div aria-hidden className="celebration-badge relative h-40 w-40">
      <svg viewBox="0 0 160 176" className="h-full w-full drop-shadow-xl">
        <defs>
          <linearGradient id="celebration-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" className={FILL_FROM} />
            <stop offset="100%" className={FILL_TO} />
          </linearGradient>
          <linearGradient id="celebration-shine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Rounded shield */}
        <path
          d="M80 6 C104 18 126 22 148 22 C152 22 154 25 154 29 L154 84 C154 130 120 158 82 172 C81 172.5 79 172.5 78 172 C40 158 6 130 6 84 L6 29 C6 25 8 22 12 22 C34 22 56 18 80 6 Z"
          fill="url(#celebration-fill)"
          className="stroke-white/80 dark:stroke-white/30"
          strokeWidth="4"
        />
        <path d="M80 14 C102 25 122 29 144 29 L144 70 C110 78 50 78 16 70 L16 29 C38 29 58 25 80 14 Z" fill="url(#celebration-shine)" />
      </svg>
      <span className="celebration-emoji absolute inset-0 flex items-center justify-center pb-3">
        <MoneyStack />
      </span>
      {SPARKLES.map((s, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className="celebration-sparkle absolute fill-amber-300 dark:fill-amber-200"
          style={{ top: s.top, left: s.left, width: s.size, height: s.size, animationDelay: s.delay }}
        >
          <path d="M12 0 C13 7 17 11 24 12 C17 13 13 17 12 24 C11 17 7 13 0 12 C7 11 11 7 12 0 Z" />
        </svg>
      ))}
    </div>
  );
}
