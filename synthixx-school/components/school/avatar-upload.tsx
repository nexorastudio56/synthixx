"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { sb } from "@/lib/school/client";

const BUCKET = "school-assets";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

/** Read-only avatar: shows the photo or an initials fallback circle. */
export function Avatar({ name, url, size = 36 }: { name: string; url?: string | null; size?: number }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex items-center justify-center rounded-full bg-accent-soft font-medium text-accent"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials(name)}
    </span>
  );
}

/**
 * Avatar uploader. Uploads to Supabase Storage `school-assets/<schoolId>/<entity>/<key>.<ext>`
 * and calls onChange with the public URL. Falls back gracefully on failure.
 */
export function AvatarUpload({
  schoolId,
  entity,
  entityId,
  name,
  value,
  onChange,
  size = 72,
}: {
  schoolId: string;
  entity: "students" | "teachers" | "parents";
  entityId?: string;
  name: string;
  value: string | null;
  onChange: (url: string | null) => void;
  size?: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const key = `${schoolId}/${entity}/${entityId || crypto.randomUUID()}-${Date.now()}.${ext}`;
      const supabase = sb();
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(key, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || "image/jpeg",
      });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
      onChange(data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <Avatar name={name || "?"} url={value} size={size} />
        {value && !busy && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -right-1 -top-1 rounded-full bg-danger p-0.5 text-white"
            title="Remove photo"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          </span>
        )}
      </div>
      <div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="sk-press inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent-soft disabled:opacity-50"
        >
          <Camera className="h-3.5 w-3.5" /> {value ? "Change photo" : "Upload photo"}
        </button>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
