// Round profile picture, falling back to initials.
export function initialsFor(name: string, email: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length) return (parts[0][0] + (parts.length > 1 ? parts.at(-1)![0] : "")).toUpperCase();
  return (email[0] ?? "?").toUpperCase();
}

export function Avatar({
  url,
  name,
  email,
  size,
}: {
  url: string | null;
  name: string;
  email: string;
  size: number;
}) {
  const style = { width: size, height: size, fontSize: size * 0.38 };
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" style={style} className="shrink-0 rounded-full bg-stone-200 object-cover" />;
  }
  return (
    <span
      style={style}
      className="flex shrink-0 items-center justify-center rounded-full bg-indigo-700 font-semibold text-white"
    >
      {initialsFor(name, email)}
    </span>
  );
}
