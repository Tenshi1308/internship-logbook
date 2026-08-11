# Implementation Roadmap

Phased plan for building the Internship Logbook Automation application.
Each phase ends with a reviewable, meaningful commit. Phases build on each
other; do not skip foundational phases.

## Phase 0 — Discovery & Architecture (current)

Status: **DONE** (this phase).

- [x] Inspect repository, `AGENTS.md`, `docs/`.
- [x] Reverse-engineer `docs/LOGBOOK_TEMPLATE.docx` structure.
- [x] Verify `LOGBOOK_TEMPLATE.docx` is a faithful working version of
      `LOGBOOK_SAMPLE.doc` (identical text, page setup, 3 tables, 10 images).
- [x] Produce `REQUIREMENTS.md`, `ARCHITECTURE.md`, `ROADMAP.md`.

Output: requirements, architecture, data model, roadmap.
Blockers: none.

---

## Phase 1 — Project Setup + Database + Authentication

Objectives

- Initialize the Next.js (App Router, TypeScript, Tailwind) project.
- Initialize Git, `.gitignore`, `.env.example`.
- Set up PostgreSQL + Prisma schema + first migration.
- Implement Auth.js email/password auth (register, login, logout, session).

Main tasks

1. Scaffold Next.js app + Tailwind.
2. `git init`, base `.gitignore`, `README.md` (short), `.env.example`.
3. Prisma schema (User + Auth.js tables), `prisma migrate dev`.
4. Auth.js v5 with Credentials provider (session/cookie handling only).
5. **Custom registration flow**: register page/action collecting name, NIM,
   email, password, scheme, and partner in one flow; password hashed
   server-side (bcrypt/argon2), never stored as plaintext. Do not rely on
   Auth.js to implement registration.
6. Login + logout pages; auth guards (layout/route protection, `auth()`
   helper).

Expected output: a deployed-ready shell where users register (with full
profile fields), log in, and sessions work.
Dependencies/blockers: PostgreSQL instance and `DATABASE_URL`, `AUTH_SECRET`.

---

## Phase 2 — User Profile + Weekly Report

Objectives

- Profile editing (name, NIM, scheme, partner).
- Weekly report creation, listing, and current-week default.
- Report header data (Skema, Mitra, Minggu ke, date range).

Main tasks

1. Profile page + update server action.
2. `WeeklyReport` CRUD; auto-create/open current week.
3. Report list page; week number + date range computed/validated.
4. Basic shell UI: report workspace layout (live-weekly-report feel).

Expected output: users can set a profile and manage weekly reports; report
header shows scheme/partner/week/date range automatically.
Dependencies/blockers: Phase 1.

---

## Phase 3 — Daily Logbook + Manual Activities

Objectives

- Daily logs with date, working hours, location, status.
- Manual activity input (first-class) with ordering.
- Persistence + resume editing.

Main tasks

1. `DailyLog` + `ManualActivity` schema (Phase 1 schema refactor).
2. Daily log editor: date, start/end working hours, location.
3. Manual activity add/edit/remove within a day.
4. Save-as-you-go; status (draft/complete); weekly progress indicator.

Expected output: users fill one day at a time and resume unfinished reports.
Dependencies/blockers: Phase 2.

---

## Phase 4 — GitHub OAuth + Commit Integration

Objectives

- Optional per-user GitHub connection via OAuth.
- Repository selection, date-range commit fetch, commit cache.
- Attach commits to daily logs as evidence.

Main tasks

1. GitHub OAuth App + `/api/github/connect` + `/api/github/callback`.
2. Token encryption at rest (`GitHubConnection`).
3. Repository list + cache (`Repository`), selection UI.
4. Commit fetch + cache (`Commit`), date-range filter UI.
5. Commit picker attaching to a daily log (`LogbookCommit`).
6. Graceful degradation when GitHub is disconnected/unavailable.

Expected output: connected users pull commits as evidence; non-connected users
are unaffected.
Dependencies/blockers: Phase 3; GitHub OAuth App credentials; `ENCRYPTION_KEY`.

---

## Phase 5 — AI-Assisted Description

Objectives

- Draft descriptions from evidence (manual activities + commits).
- Editable output; user is final authority.

Main tasks

1. `lib/ai.ts` prompt builder with strict evidence-only rules.
2. `/api/ai/generate` server action/route; model call server-side.
3. Draft → `aiDraft` → editable editor → `finalDescription`.
4. Error handling for AI failures/rate limits; no blocking of manual work.

Expected output: one click drafts a professional Indonesian description;
user edits and saves.
Dependencies/blockers: Phase 3; LLM API key.

---

## Phase 6 — Documentation Upload

Objectives

- Upload, preview, delete, caption documentation photos via Cloudinary.

Main tasks

1. `DocumentationPhoto` schema.
2. Server-side validation + Cloudinary signed upload.
3. Gallery UI with preview/delete/caption/order.
4. Association with weekly report (+ optional daily log).

Expected output: photos stored in Cloudinary and manageable per week.
Dependencies/blockers: Phase 3; Cloudinary credentials.

---

## Phase 7 — Weekly Report Preview

Objectives

- Live preview that mirrors the final DOCX layout.

Main tasks

1. `report-builder.ts` renders report data into an HTML preview matching the
   template layout (header table, tables, headings, appendix).
2. Print-styled preview page; read-only.
3. Progress/completeness summary.

Expected output: users review the report as it will appear before export.
Dependencies/blockers: Phase 3 (+ photos from Phase 6).

---

## Phase 8 — DOCX / PDF Generation

Objectives

- Server-side DOCX matching `LOGBOOK_TEMPLATE.docx`.
- PDF as MVP via client print-to-PDF; optional CloudConvert later.

Main tasks

1. **Proof-of-concept (gate)**: generate one sample weekly report with the
   chosen approach and verify visual consistency with
   `docs/LOGBOOK_TEMPLATE.docx` (page/margins, font, header/logo, merged
   cells, table structure/widths, heading styles, numbering, page breaks,
   appendix layout, images, captions).
2. `lib/docgen/template-spec.ts` constants from the analyzed template.
3. `report-builder.ts` builds the DOCX (tables, numbering, shading, images).
4. `/api/reports/[id]/export` streams the DOCX download.
5. Client-side print-to-PDF route/button.
6. Compare generated output against the sample (Word opens, layout matches);
   switch the generation approach (e.g. from-scratch `docx` vs. OpenXML
   template-filling) if a server-compatible option is technically better and
   passes the gate.

Expected output: faithful DOCX export and usable PDF, verified against the
template before ship.
Dependencies/blockers: Phase 7; template constants verified against
`LOGBOOK_TEMPLATE.docx`; PoC gate passed.

---

## Phase 9 — Testing + Security Review

Objectives

- Validate behavior, authorization boundaries, and error handling.

Main tasks

1. Type checking, ESLint, build in CI.
2. Unit tests: AI prompt builder, doc generator, ownership helpers.
3. Integration tests: auth, data isolation (User A vs User B), uploads,
   GitHub/AI failure paths.
4. Security review: no secrets in client, token encryption, upload
   validation, CSRF on server actions, rate limits.

Expected output: passing checks; documented security posture.
Dependencies/blockers: Phases 1–8.

---

## Phase 10 — Vercel Deployment

Objectives

- Production deployment with correct env vars and external services.

Main tasks

1. Deploy to Vercel; configure env vars.
2. Provision managed PostgreSQL; run migrations.
3. Register GitHub OAuth App / Cloudinary / LLM provider for production.
4. Smoke-test full flow in production (auth, reports, GitHub, AI, upload,
   export).
5. `.env.example` finalized; README runbook.

Expected output: live production app for the user and friends.
Dependencies/blockers: Phases 1–9; production credentials and accounts.
