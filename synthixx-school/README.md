# Synthixx Campus (`school.synthixx.com`)

Standalone Next.js app for the Synthixx School & University management platform.
It is a sibling of the main app (repo root) and the marketing site
(`synthixx-website/`), sharing the same Supabase project.

## Local development

```bash
cd synthixx-school
cp .env.example .env.local   # fill in Supabase + Gemini keys
npm install
npm run dev                  # http://localhost:3002
```

The dashboard lives under `/school`; the bare domain redirects there. Public
routes: `/admissions/[schoolId]` and the payment callbacks.

## Structure

- `app/school/**` — dashboard modules (K-12 + university)
- `app/admissions/**` — public admission forms
- `app/api/school*/**` — server routes (context, create, notify, payments, AI)
- `lib/school/**` — client queries, roles, grading, university helpers
- `components/school/**` — UI shell, sidebar, primitives
- `lib/ai.ts` — slim Gemini streaming (school AI endpoints)

University layer (colleges/universities):

- Programs & Departments, Course Catalog, Semesters & Offerings, Registration,
  GPA & Transcripts, Student Portal
- Examination Cell, Hostel, Scholarships, Research/Thesis, Registrar

The sidebar shows the university sections only when `institution_type` is
`college` or `university` (set when the institution is created).

## Database

Run these once in the Supabase SQL editor (same project as the main app):

1. `supabase/school-management.sql` (base K-12 schema)
2. `supabase/institution-university.sql` (university extension)

See `DEPLOYMENT.md` for the production/Vercel/Supabase steps.
