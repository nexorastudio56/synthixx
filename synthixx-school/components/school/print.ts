"use client";

import { qrSvg } from "@/lib/school/qr";
import type { Student } from "@/lib/school/types";

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

interface BaseOpts {
  schoolName?: string | null;
  logoUrl?: string | null;
  letterhead?: string | null;
}

const BASE_CSS = `
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #111; margin: 0; padding: 48px; line-height: 1.7; }
  .head { text-align: center; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 28px; }
  .head img { max-height: 72px; margin-bottom: 8px; }
  .school { font-size: 24px; font-weight: 700; letter-spacing: .5px; }
  .letterhead { color: #444; font-size: 13px; margin-top: 4px; white-space: pre-wrap; }
  .title { font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 16px; text-align: center; }
  .meta { color: #555; font-size: 13px; margin-top: 4px; }
  .body { white-space: pre-wrap; font-size: 15px; }
  .sign { margin-top: 64px; display: flex; justify-content: space-between; font-size: 14px; }
  .sign div { border-top: 1px solid #111; padding-top: 6px; width: 200px; text-align: center; }
  table.kv { width: 100%; border-collapse: collapse; font-size: 14px; margin: 12px 0; }
  table.kv td, table.kv th { border: 1px solid #999; padding: 8px 10px; text-align: left; }
  table.kv th { background: #f3f3f3; }
  .row { display: flex; justify-content: space-between; gap: 16px; }
  .muted { color: #555; }
  .idcard { width: 340px; border: 2px solid #111; border-radius: 12px; padding: 18px; margin: 12px auto; }
  .idcard .name { font-size: 20px; font-weight: 700; }
  @media print { body { padding: 24px; } }
`;

function head(opts: BaseOpts, meta?: string) {
  return `<div class="head">
    ${opts.logoUrl ? `<img src="${escape(opts.logoUrl)}" alt="logo" />` : ""}
    <div class="school">${escape(opts.schoolName || "School")}</div>
    ${opts.letterhead ? `<div class="letterhead">${escape(opts.letterhead)}</div>` : ""}
    ${meta ? `<div class="meta">${escape(meta)}</div>` : ""}
  </div>`;
}

function open(title: string, inner: string) {
  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escape(title)}</title>
  <style>${BASE_CSS}</style></head><body>${inner}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 350);
}

/** Simple text document with letterhead (certificates, reports, AI output). */
export function printDocument(opts: BaseOpts & { title: string; body: string; meta?: string }) {
  open(
    opts.title,
    `${head(opts, opts.meta)}
     <div class="title">${escape(opts.title)}</div>
     <div class="body">${escape(opts.body)}</div>
     <div class="sign"><div>Issued by</div><div>Principal</div></div>`,
  );
}

/** Fully custom inner HTML (trusted/composed by us) under the standard letterhead. */
export function printHTML(opts: BaseOpts & { title: string; html: string; meta?: string }) {
  open(opts.title, `${head(opts, opts.meta)}<div class="title">${escape(opts.title)}</div>${opts.html}`);
}

/** Print a student ID card with photo (if any) and a scannable QR of the id. */
export async function printIdCardHTML(
  opts: BaseOpts & { student: Student },
) {
  const s = opts.student;
  let qr = "";
  try {
    qr = await qrSvg(s.id, 96);
  } catch {
    qr = "";
  }
  const photo = s.photo_url
    ? `<img src="${escape(s.photo_url)}" alt="" style="width:72px;height:72px;border-radius:8px;object-fit:cover;border:1px solid #ccc" />`
    : "";
  const html = `
    <div class="idcard">
      <div class="row" style="align-items:center;gap:14px">
        ${photo}
        <div style="flex:1">
          <div class="name">${escape(s.name)}</div>
          <div class="muted">Class ${escape(s.class ?? "—")}${s.roll_no ? ` · Roll ${escape(s.roll_no)}` : ""}</div>
          <div class="muted">ID: ${escape(s.id.slice(0, 8).toUpperCase())}</div>
        </div>
        <div style="width:96px;height:96px">${qr}</div>
      </div>
      ${s.parent_name ? `<div class="muted" style="margin-top:10px">Guardian: ${escape(s.parent_name)}${s.parent_phone ? ` · ${escape(s.parent_phone)}` : ""}</div>` : ""}
    </div>`;
  printHTML({ ...opts, title: "Student ID Card", html });
}

export { escape as escapeHTML };
