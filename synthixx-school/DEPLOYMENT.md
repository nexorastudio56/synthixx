# Deploying Synthixx Campus to `school.synthixx.com`

## Status

| Step | State |
|------|-------|
| Vercel project `synthixx-school` created | ✅ done |
| Env vars set (production + preview + development) | ✅ done |
| Node runtime pinned to `24.x` | ✅ done |
| Production deploy | ✅ done — https://synthixx-school.vercel.app |
| Domain `school.synthixx.com` attached to project | ✅ done (verified, ownership ok) |
| DNS record in Cloudflare (CNAME) | ✅ done — resolves to Vercel |
| TLS certificate | ✅ issued |
| Supabase Auth redirect URLs | ✅ done |
| DB migrations | ✅ already applied |
| Main app redirects / marketing links | ✅ in code |

**Live:** https://school.synthixx.com → redirects to `/school` (then `/login`).

---

## ⏳ Step A — Cloudflare DNS (only you can do this)

The domain `synthixx.com` uses **Cloudflare** nameservers, so Vercel cannot
create the record automatically. In the Cloudflare dashboard for `synthixx.com`
→ **DNS → Records → Add record**:

| Field | Value |
|-------|-------|
| Type | `CNAME` |
| Name | `school` |
| Target | `b3e105989842c191.vercel-dns-017.com` |
| Proxy status | **DNS only** (grey cloud — proxy OFF) |
| TTL | Auto |

(Fallback target if the first is rejected: `cname.vercel-dns.com`.)

Then verify:

```bash
cd synthixx-school
vercel domains verify school.synthixx.com
```

Alternatively, open the Cloudflare Domain Connect link Vercel printed to apply
it automatically:
`https://vercel.com/api/v9/projects/prj_H1vQ6a1PaMnpoqHBclXlnqz7IwZE/domains/school.synthixx.com/domain-connect/apply?teamId=team_ALksdnWD3x5dB1ugKBUcMO51`

## ⏳ Step B — Supabase Auth redirect URLs (only you can do this)

In **Supabase → Authentication → URL Configuration**, add to the allow-list:

- `https://school.synthixx.com/auth/callback`
- `https://school.synthixx.com/**`

If Google OAuth is enabled, also add `https://school.synthixx.com/auth/callback`
to the **Authorized redirect URIs** in Google Cloud Console.

Optional: to share sessions across `*.synthixx.com`, set the Supabase cookie
domain to `.synthixx.com`.

---

## Reference — what's already wired in code

- **Vercel project:** `nexorastudio56s-projects/synthixx-school`, Root Directory
  = `synthixx-school`, Node `24.x`.
- **Env vars** set for production/preview/development: `NEXT_PUBLIC_APP_URL`
  (`https://school.synthixx.com`), `NEXT_PUBLIC_APP_NAME`,
  `NEXT_PUBLIC_MAIN_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`,
  `JWAD_GEMINI_MODEL_FAST`, `JWAD_GEMINI_MODEL_PRO`.
- **Main app redirects:** repo root `next.config.ts` redirects
  `app.synthixx.com/school/*` and `/admissions/*` to `school.synthixx.com`
  (host-gated — localhost unaffected).
- **Marketing links:** `synthixx-website/lib/links.ts` exposes `SCHOOL_APP_URL` /
  `schoolAppUrl()` (env `NEXT_PUBLIC_SCHOOL_APP_URL`, default
  `https://school.synthixx.com`).
- **DB migrations** (already applied to the current project):
  `supabase/school-management.sql` then `supabase/institution-university.sql`.

## Cleanup (after subdomain is verified live)

Once `school.synthixx.com` resolves and works, you can delete the embedded
school code from the main app to keep `app.synthixx.com` lean:
`src/app/(school)`, `src/lib/school`, `src/components/school`,
`src/app/api/school*`, `src/app/admissions`.
