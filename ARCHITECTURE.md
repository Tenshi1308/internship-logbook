# Architecture

## 1. Overview

A Next.js (App Router) application deployed on Vercel. PostgreSQL is the
database, accessed through Prisma. Authentication uses Auth.js. Optional
GitHub OAuth provides commit evidence. An LLM API drafts descriptions.
Cloudinary stores documentation photos. A server-side Node library generates
the DOCX report that faithfully reproduces `docs/LOGBOOK_TEMPLATE.docx`.

```text
Browser
   │
   ▼
Next.js (App Router) on Vercel
   ├── React Server Components  (read data, render)
   ├── Server Actions           (mutations)
   └── Route Handlers           (OAuth, AI, upload, export)
        │
        ├── Prisma ──────────────► PostgreSQL
        ├── Auth.js ──────────────► session cookie
        ├── GitHub OAuth/API ────► GitHub
        ├── LLM API ─────────────► provider
        ├── Cloudinary API ──────► Cloudinary
        └── docx generator ──────► DOCX stream (→ optional PDF service)
```

## 2. Stack

| Area            | Choice                                             |
|-----------------|----------------------------------------------------|
| Framework       | Next.js (App Router), TypeScript                    |
| Styling         | Tailwind CSS                                        |
| Database        | PostgreSQL (managed: Neon / Supabase / Vercel PG)   |
| ORM             | Prisma                                              |
| Auth            | Auth.js (NextAuth v5) + Credentials, JWT session strategy (no DB adapter — only the `User` table is used) |
| GitHub          | GitHub OAuth App + REST API v3                      |
| AI              | OpenAI-compatible LLM API (server-side only)        |
| Images          | Cloudinary (signed server-side upload)              |
| DOCX generation | `docx` (npm, pure JS, serverless-safe) — subject to visual-fidelity PoC; may switch to a template-filling approach if technically better |
| PDF (optional)  | Client print-to-PDF (MVP) / CloudConvert API        |
| Hosting         | Vercel                                              |

## 3. Application Layers

### 3.1 Frontend (client components)

- Live weekly-report workspace: daily-log status, activity editors, plan and
  evaluation text areas, documentation gallery, progress indicator.
- Auth pages, profile page, GitHub connection panel, preview/export actions.
- Forms and small interactive widgets (date, working hours, location,
  activity list, commit picker, photo upload/caption/delete).
- No business logic or secrets live in the client.

### 3.2 Server (App Router)

- **Server Components / Page Loaders**: read data via Prisma, always scoped to
  the session user; render the live report.
- **Server Actions**: create/update/delete weekly reports, daily logs, manual
  activities, commit attachments, photos (metadata), next-week plan,
  evaluation; save AI drafts; finalize status.
- **Route Handlers** (API routes):
  - `/api/auth/*` – Auth.js routes.
  - `/api/github/connect`, `/api/github/callback` – OAuth flow.
  - `/api/github/repos`, `/api/github/commits` – GitHub data proxy (server
    keeps the token).
  - `/api/ai/generate` – AI draft generation.
  - `/api/upload/signature` – Cloudinary signed-upload signature (optional).
  - `/api/reports/[id]/export` – stream generated DOCX (and PDF later).
- All handlers re-validate the session user before touching data.

### 3.3 Database layer (Prisma)

See §5 for entities. Every user-owned entity has a `userId` owner chain and is
queried with the session user's id. Prisma migrations manage the schema.

### 3.4 GitHub integration layer

- One shared GitHub OAuth App (owned by the app developer).
- `/api/github/connect` redirects to GitHub with state bound to the session.
- `/api/github/callback` exchanges the code for an access token, encrypts it,
  and stores it in `GitHubConnection` (per user).
- Repository list and commit fetch use the stored token server-side.
- Rate-limited and cached; failures degrade gracefully.

### 3.5 AI generation layer

- Server-only. Builds a prompt from: manual activities + attached commits
  (messages, changed files) + date/location context.
- Strong constraints: evidence-only, no invented claims, professional
  Indonesian, concise.
- Returns a draft the user can edit; the edited version is the final
  description.

### 3.6 Image storage layer

- Server issues a signed upload signature (or uploads server-side) to
  Cloudinary; the public URL + public id are stored in `DocumentationPhoto`.
- Client never receives Cloudinary secrets.
- Validation (type/size) happens server-side before/at upload.

### 3.7 Document generation layer

- Server-side DOCX builder. Primary candidate is the pure-JS `docx` library
  (serverless-safe); a template-filling approach (e.g. OpenXML manipulation of
  `docs/LOGBOOK_TEMPLATE.docx`) is an acceptable alternative.
- **Fidelity is verified, not assumed.** The chosen approach must reproduce
  the template's important visual characteristics: A4 portrait, 0.5" margins,
  Times New Roman 12pt, double line spacing, bordered tables with exact column
  widths, shaded numbered headings, header/logo with merged cells, explicit
  page break before the appendix, centered images with italic captions.
- A proof-of-concept that generates one sample weekly report must be reviewed
  against the template before the final generation feature is built (see
  §10).
- Produces a binary stream returned as `application/vnd.openxmlformats-officedocument.wordprocessingml.document`.
- PDF: MVP uses client-side print-to-PDF; optional CloudConvert DOCX→PDF.

## 4. App Router Layout (planned)

```text
app/
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── (app)/
│   ├── layout.tsx               # authenticated shell + nav
│   ├── profile/page.tsx
│   ├── github/page.tsx          # connection + repository management
│   └── reports/
│       ├── page.tsx             # current week / report list
│       └── [id]/
│           ├── page.tsx         # live weekly report workspace
│           └── preview/page.tsx
api/
│   ├── auth/[...nextauth]/route.ts
│   ├── github/connect/route.ts
│   ├── github/callback/route.ts
│   ├── github/repos/route.ts
│   ├── github/commits/route.ts
│   ├── ai/generate/route.ts
│   ├── upload/signature/route.ts
│   └── reports/[id]/export/route.ts
lib/
├── auth.ts / auth.config.ts
├── prisma.ts                    # singleton Prisma client
├── github.ts                    # OAuth + API client
├── ai.ts                        # prompt + LLM call
├── cloudinary.ts
├── encrypt.ts                   # token encryption
├── ownership.ts                 # scoped query helpers
└── docgen/
    ├── report-builder.ts        # docx generation
    └── template-spec.ts         # constants from LOGBOOK_TEMPLATE.docx
prisma/
├── schema.prisma
└── migrations/
```

## 5. Database Entities

### 5.1 `User`

- Purpose: identity + profile.
- Fields: `id`, `email` (unique), `passwordHash`, `name`, `nim`, `scheme`,
  `partner`, `createdAt`, `updatedAt`.
- Relationships: has many WeeklyReports, one GitHubConnection.
- Ownership: root owner of every resource.

### 5.2 Auth.js sessions

Auth.js uses the **JWT session strategy**: sessions live in an encrypted
signed cookie (`authjs.session-token`); no `Account`/`Session`/`VerificationToken`
tables exist. The `User` row is the single source of truth for credentials;
`authorize()` verifies the bcrypt hash and the JWT carries `{ id, name, email }`.

### 5.3 `GitHubConnection`

- Purpose: store one user's GitHub OAuth credentials.
- Fields: `id`, `userId` (unique), `githubUserId`, `githubUsername`,
  `accessTokenEncrypted`, `refreshTokenEncrypted?`, `tokenExpiresAt?`,
  `createdAt`, `updatedAt`.
- Relationships: belongs to User; has many Repositories.
- Security: unique per user; token encrypted at rest; never serialized to
  client. One GitHubConnection max per user (reconnect replaces).

### 5.4 `Repository`

- Purpose: cached list of repos the user has access to / selected.
- Fields: `id`, `githubId`, `name`, `fullName`, `owner`, `defaultBranch`,
  `isSelected`, `lastFetchedAt`, `userId`.
- Relationships: belongs to GitHubConnection (and User); has many Commits.

### 5.5 `Commit`

- Purpose: cached GitHub commit evidence, so attach decisions persist and
  offline use works.
- Fields: `id`, `repositoryId`, `sha` (unique per repo), `message`,
  `authorName`, `authorEmail`, `committedAt`, `changedFilesJson`,
  `additions?`, `deletions?`, `url`.
- Relationships: belongs to Repository; many-to-many with DailyLog through
  `LogbookCommit`.

### 5.6 `LogbookCommit` (join)

- Purpose: attach a commit to a specific daily log as evidence.
- Fields: `id`, `dailyLogId`, `commitId`, `createdAt`.
- Unique constraint `(dailyLogId, commitId)`.

### 5.7 `WeeklyReport`

- Purpose: parent container for one week of daily logs.
- Fields: `id`, `userId`, `weekNumber`, `startDate`, `endDate`,
  `nextWeekPlan` (text), `studentEvaluation` (text), `status` (enum:
  `DRAFT`/`COMPLETED`), `createdAt`, `updatedAt`.
- Relationships: belongs to User; has many DailyLogs and DocumentationPhotos.
- Note: scheme/partner/name/NIM live on the User and are copied into the
  generated document, not duplicated per report.

### 5.8 `DailyLog`

- Purpose: one day's logbook entry.
- Fields: `id`, `weeklyReportId`, `dayNumber`, `date`, `startTime`, `endTime`,
  `location`, `status` (enum: `DRAFT`/`COMPLETE`), `aiDraft` (text),
  `finalDescription` (text), `createdAt`, `updatedAt`.
- Relationships: belongs to WeeklyReport; has many ManualActivities;
  many-to-many Commits via `LogbookCommit`.

### 5.9 `ManualActivity`

- Purpose: first-class manual activity lines.
- Fields: `id`, `dailyLogId`, `order`, `description`, `createdAt`.
- Relationships: belongs to DailyLog.

### 5.10 `DocumentationPhoto`

- Purpose: documentation images for the weekly appendix.
- Fields: `id`, `weeklyReportId`, `dailyLogId?` (optional association),
  `cloudinaryPublicId`, `url`, `caption`, `order`, `createdAt`.
- Relationships: belongs to WeeklyReport (and optionally DailyLog).

### 5.11 Relationship summary

```text
User 1─n WeeklyReport 1─n DailyLog 1─n ManualActivity
User 1─1 GitHubConnection 1─n Repository 1─n Commit
DailyLog n─m Commit          (via LogbookCommit)
WeeklyReport 1─n DocumentationPhoto
```

### 5.12 Ownership / security model

- Every table above carries an implicit owner chain ending at `User`.
- All Prisma reads/writes start from the authenticated session user's id and
  filter by it (e.g., `weeklyReport.userId === session.user.id`).
- Delete behavior: cascading deletes for owned children; deleting a
  connection also deletes its repositories/commits (or orphans are cleaned).
- A user's GitHub token never leaves the server.

## 6. Authentication / Authorization Flow

1. **Registration is custom application code**: the register page/action
   validates input and creates the `User` row with name, NIM, email, password,
   scheme, and partner. The password is hashed (bcrypt/argon2) server-side
   before persistence. Auth.js does not implement this flow — it is
   responsible only for session/cookie handling and credential verification.
2. Login → Auth.js Credentials verifies against the stored bcrypt hash →
   encrypted JWT session cookie (no database-backed session).
3. Every page load, server action, and route handler calls `auth()` and
   re-verifies the session.
4. Ownership checks: `record.userId === session.user.id` before read/write/
   delete/export. Client-supplied ids are never trusted as owner ids.

## 7. GitHub Integration Flow

```text
[User] Connect GitHub
  → GET /api/github/connect (session-bound state)
  → GitHub authorize URL (OAuth App scopes: repo, read:user)
  → GET /api/github/callback?code&state
  → exchange code → access token (server-side)
  → encrypt + upsert GitHubConnection
  → GET /api/github/repos  (list user's repos, cache in Repository)
  → user selects repo + date range
  → GET /api/github/commits (fetch via REST, cache in Commit)
  → user attaches selected commits to a DailyLog (LogbookCommit)
```

Token refresh handled via refresh token when supported; otherwise re-OAuth on
expiry. All calls from the server; the client only sees non-sensitive data.

## 8. AI Generation Flow

```text
DailyLog → manual activities + attached commits (+ changed files)
  → build evidence-only prompt (Indonesian, strict no-invention rules)
  → call LLM API server-side
  → save draft to DailyLog.aiDraft
  → user edits in UI → finalDescription
```

Failures surface a clear error; the user can always write manually.

## 9. Image Upload Flow

1. Server validates request (session, target report ownership, file
   type/size).
2. Server asks Cloudinary for a signed upload (or uploads directly).
3. Client uploads to Cloudinary.
4. Server stores `cloudinaryPublicId`, `url`, `caption`, `order`.
5. Preview from `url`; delete removes Cloudinary asset + DB row.

## 10. Document Generation Flow

1. **Proof-of-concept gate (before building the final feature)**: generate one
   sample weekly report with the chosen approach and verify it remains
   visually consistent with `docs/LOGBOOK_TEMPLATE.docx` (page/margins, font,
   header/logo, merged cells, table structure/widths, heading styles,
   numbering, page breaks, appendix layout, images, captions). Iterate or
   switch approach (e.g. `docx` from-scratch vs. OpenXML template-filling)
   until the gate passes.
2. Load `WeeklyReport` + daily logs + activities + commits + photos (scoped
   to user).
3. Build DOCX server-side using `template-spec.ts` constants that mirror
   `LOGBOOK_TEMPLATE.docx` (page, margins, fonts, tables, numbering, shading,
   appendix).
4. Return the `.docx` stream for download.
5. Optional: POST DOCX to CloudConvert → PDF download link (later phase).

## 11. Deployment Architecture (Vercel)

- Monorepo-less single Next.js app deployed to Vercel.
- Env vars in Vercel project settings (see `REQUIREMENTS.md` / `.env.example`).
- PostgreSQL managed externally (Neon/Supabase/Vercel Postgres) reached via
  `DATABASE_URL`.
- Serverless-friendly: pure-JS DOCX generation, no native binaries, within
  Vercel's function size/time limits for typical weekly reports.
- No long-running processes; Auth.js + Prisma scale with serverless.

## 12. Documented Format Constraints (from the template)

- A4 portrait (11907×16840 twips), margins 720 twips (0.5 in) all sides.
- Font: Times New Roman, 12 pt (sz 24), double line spacing (line 360 auto).
- Table borders: single, sz 4.
- Section headings: bold, shaded fill `CAEDFB`, numbered (`1. Log Harian Jam
  Kerja`, `2. Rincian Kegiatan`, `3. Rencana Kegiatan Untuk Minggu Depan`,
  `4. Penilaian Mahasiswa ...`).
- Header table (2×2 with vertical-merged logo cell, 1809/8789 twips).
- Working-hours table columns: No(813) / Hari(1590) / Tanggal(3167) / Jam
  Kerja(2614).
- Activity table columns: No(514) / Hari-Tanggal(2277) / Lokasi(3021) /
  Rincian Kegiatan(4820), total width 10632.
- Next-week plan and evaluation use lettered list numbering (a., b., …).
- Appendix: explicit page break, centered bold `LAMPIRAN` and
  `"DOKUMENTASI DAN HASIL KEGIATAN"`, centered images with italic centered
  captions `Gambar N. ...`.
