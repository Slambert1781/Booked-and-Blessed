// The celebration badge drawing: a rounded shield with a soft purple-pink
// gradient, a large emoji and a few sparkles. Drawn in code (SVG + CSS), no
// animation files. Decorative only (aria-hidden): the message beside it is
// the real text.
//
// To use a different design (or an animation file) later, replace this
// component; the pop-up only relies on it rendering a square ~160px element.

const SPARKLES = [
  { top: "4%", left: "10%", size: 18, delay: "0ms" },
  { top: "12%", left: "84%", size: 14, delay: "220ms" },
  { top: "70%", left: "-2%", size: 12, delay: "420ms" },
  { top: "78%", left: "90%", size: 16, delay: "140ms" },
];

export function CelebrationBadge({ emoji = "⭐" }: { emoji?: string }) {
  return (
    <div aria-hidden className="celebration-badge relative h-40 w-40">
      <svg viewBox="0 0 160 176" className="h-full w-full drop-shadow-xl">
        <defs>
          <linearGradient id="celebration-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" className="[stop-color:#a78bfa] dark:[stop-color:#7c3aed]" />
            <stop offset="100%" className="[stop-color:#f472b6] dark:[stop-color:#db2777]" />
          </linearGradient>
          <linearGradient id="celebration-shine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
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
      <span className="celebration-emoji absolute inset-0 flex items-center justify-center pb-3 text-[64px] leading-none">
        {emoji}
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
