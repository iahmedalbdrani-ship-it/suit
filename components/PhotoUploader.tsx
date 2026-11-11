"use client";

import { useEffect, useRef, useState } from "react";

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 20;

type Labels = {
  pick: string; hint: string; limits: string; selected: string; remove: string; cover: string; earlier: string; later: string;
  badType: string; tooBig: string; tooMany: string;
};
type Item = { id: number; file: File; url: string };

/**
 * Photo picker with client-side validation (type, 5 MB), previews, reordering (first = cover) and removal.
 * The chosen files are placed, in order, into a real <input type="file" name="photos"> so the server action receives them.
 * The server validates again: this is a convenience, not the security boundary.
 */
export function PhotoUploader({ labels, name = "photos", existing = 0 }: { labels: Labels; name?: string; existing?: number }) {
  const [items, setItems] = useState<Item[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const seq = useRef(0);

  // Mirror the ordered selection into the hidden file input.
  useEffect(() => {
    if (!input.current) return;
    const dt = new DataTransfer();
    items.forEach((i) => dt.items.add(i.file));
    input.current.files = dt.files;
  }, [items]);

  useEffect(() => () => items.forEach((i) => URL.revokeObjectURL(i.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const add = (list: FileList | File[]) => {
    const errs: string[] = [];
    const next: Item[] = [];
    for (const f of Array.from(list)) {
      if (!TYPES.includes(f.type)) { errs.push(labels.badType.replace("{name}", f.name)); continue; }
      if (f.size > MAX_BYTES) { errs.push(labels.tooBig.replace("{name}", f.name)); continue; }
      if (existing + items.length + next.length >= MAX_FILES) { errs.push(labels.tooMany); break; }
      next.push({ id: ++seq.current, file: f, url: URL.createObjectURL(f) });
    }
    setErrors(errs);
    if (next.length) setItems((cur) => [...cur, ...next]);
  };

  const move = (i: number, d: -1 | 1) => setItems((cur) => {
    const j = i + d;
    if (j < 0 || j >= cur.length) return cur;
    const c = [...cur];
    [c[i], c[j]] = [c[j], c[i]];
    return c;
  });
  const remove = (id: number) => setItems((cur) => {
    const gone = cur.find((x) => x.id === id);
    if (gone) URL.revokeObjectURL(gone.url);
    return cur.filter((x) => x.id !== id);
  });

  return (
    <div className="stack" style={{ gap: "0.75rem" }}>
      <label
        className="dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); add(e.dataTransfer.files); }}
      >
        <strong>{labels.pick}</strong>
        <span className="muted small">{labels.hint}</span>
        <span className="muted xs">{labels.limits}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          onChange={(e) => { if (e.target.files) add(e.target.files); e.target.value = ""; }}
        />
      </label>
      {/* The real field submitted with the form. Kept in sync with the ordered list above. */}
      <input ref={input} type="file" name={name} multiple hidden tabIndex={-1} aria-hidden="true" />
      {errors.length > 0 && (
        <ul className="alert alert-error small" role="alert" style={{ margin: 0, paddingInlineStart: "1.25rem" }}>
          {errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}
      {items.length > 0 && (
        <>
          <p className="small muted" style={{ margin: 0 }} aria-live="polite">{labels.selected.replace("{n}", String(items.length))}</p>
          <ul className="photo-grid" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {items.map((it, i) => (
              <li key={it.id}>
                <figure style={{ margin: 0 }}>
                  <img src={it.url} alt={it.file.name} width={320} height={240} />
                  <figcaption>
                    {existing === 0 && i === 0 && <span className="badge badge-mint">{labels.cover}</span>}
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`${labels.earlier}: ${it.file.name}`}>↑</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={`${labels.later}: ${it.file.name}`}>↓</button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(it.id)}>{labels.remove}</button>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
