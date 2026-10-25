"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "./Avatar";

const SIZE = 400; // stored photos are square, 400x400

// Crop to a centred square and shrink, so phone photos upload quickly.
async function toSquareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  canvas
    .getContext("2d")!
    .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.85),
  );
}

export function AvatarUpload({
  userId,
  url: initialUrl,
  name,
  email,
}: {
  userId: string;
  url: string | null;
  name: string;
  email: string;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const path = `${userId}/avatar.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, await toSquareJpeg(file), { upsert: true, contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const publicUrl = `${supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
      const { error: metaErr } = await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      if (metaErr) throw metaErr;
      setUrl(publicUrl);
      router.refresh();
    } catch {
      setError("Couldn't upload that photo. Try a different one.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    await supabase.storage.from("avatars").remove([`${userId}/avatar.jpg`]);
    await supabase.auth.updateUser({ data: { avatar_url: null } });
    setUrl(null);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar url={url} name={name} email={email} size={72} />
      <div className="space-y-1">
        <button type="button" className="btn-secondary py-2 text-sm" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? "Saving…" : url ? "Change photo" : "Add a photo"}
        </button>
        {url && !busy && (
          <button type="button" className="block text-sm text-stone-500" onClick={remove}>
            Remove photo
          </button>
        )}
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) upload(f);
        }}
      />
    </div>
  );
}
