# Requirements

## 1. Project Goal

A private web application that automates the creation of internship (immersion)
daily logbooks and weekly reports. Users record daily internship activities,
optionally import GitHub commit evidence, use an LLM to draft a professional
Indonesian description, and export a DOCX (and later PDF) report that follows
the format of the original logbook sample (`docs/LOGBOOK_SAMPLE.doc`).

The app is built for one primary user and a small number of friends. It is not
an enterprise SaaS product.

## 2. Target Users

- Internship students at Universitas Pignatelli Triputra (S1 Informatika).
- Small, trusted group (the owner and friends). No self-serve public signup
  is needed beyond simple email/password registration.
- Users may or may not connect GitHub. The application must remain fully
  usable without GitHub.

## 3. Core Workflow

```text
Daily Internship Activities
        ↓
Manual Activity Input
        + Optional GitHub Activity
        ↓
AI-Assisted Description (editable)
        ↓
Daily Logbook (saved per day)
        ↓
Weekly Report (parent container)
        ↓
Live Preview
        ↓
DOCX / PDF
```

## 4. Functional Requirements

### 4.1 Authentication

- Explicit email + password **registration** and **login** (no external-only
  sign-in).
- Registration must collect, in a single flow:
  - name
  - NIM
  - email
  - password
  - scheme (Skema)
  - partner (Mitra)
- Passwords must never be stored as plaintext; they must be securely hashed
  (e.g. bcrypt/argon2) server-side before persisting.
- Session management appropriate for Next.js on Vercel; logout.
- The full registration flow is custom application code. Auth.js (or any
  library) is used for session/cookie handling only, and must **not** be
  assumed to implement registration automatically.
- All data access scoped to the authenticated user (server-side checks).

### 4.2 User Profile

- Fields: `name`, `NIM`, `scheme` (Skema), `partner` (Mitra).
- Entered once during registration/profile setup.
- Automatically reused for every weekly report; never re-enter per report.
- Note: the current logbook sample does not display `name`/`NIM`. These are
  kept for the profile and for any future report section that requires them.

### 4.3 Weekly Reports

- Multiple weekly reports per user.
- A report is the parent container with:
  - week number (`Minggu ke`)
  - start date / end date
  - daily logs
  - next-week plan (`Rencana Kegiatan Untuk Minggu Depan`)
  - student evaluation/reflection (`Penilaian Mahasiswa`)
  - documentation photos (appendix)
- Reports persist; users can resume an unfinished report at any time.
- UI opens on the current week's report by default.

### 4.4 Daily Logs

- Belong to one weekly report.
- Fields:
  - date
  - day (derived from date)
  - working hours (start/end, e.g. `8:04 – 14:56`)
  - location (e.g. `WFH`, office)
  - manual activities (one or more)
  - optional GitHub commits attached as evidence
  - AI-drafted description
  - edited/final description
  - status (draft / complete)
- Saved persistently, one day at a time.

### 4.5 Manual Activities

First-class data, not an afterthought.

Examples: morning briefing, meetings, discussions, planning, presentations,
research, documentation, coding, and other non-commit activities.

Manual activities are the main input for the AI draft when GitHub is not
connected.

### 4.6 Optional GitHub Integration

Per-user and strictly optional.

Workflow:

```text
Login
  ↓
Optional Connect GitHub (OAuth)
  ↓
Select Repository
  ↓
Select Date / Date Range
  ↓
Fetch Commits
  ↓
Attach Commits to a Day as Evidence
```

Relevant commit data: SHA, message, author, date/time, changed files,
additions/deletions when available.

Constraints:

- Uses GitHub OAuth (no raw API-key input by users).
- Access tokens stored server-side, encrypted, never sent to the client.
- Each user's GitHub connection is isolated.
- GitHub failures must fail gracefully; the user can keep working manually.

### 4.7 AI-Assisted Description

Input: manual activities + attached GitHub commit messages/files.

Output: a concise, professional, natural-Indonesian draft description.

Hard rules for AI:

- Use only provided, verified evidence.
- Never invent activities, meetings, results, problems, or completion claims.
- Output remains editable by the user; the user is the final authority.

### 4.8 Documentation Photos

- Upload photos/screenshots (per weekly report / daily log).
- Preview, delete, caption.
- File type and size validation.
- Stored in Cloudinary (not as binaries in PostgreSQL).
- Appear in the report appendix with captions like `Gambar N. ...`.

### 4.9 Live Weekly Report Preview

- The main interface behaves like a live weekly report, not a generic admin
  dashboard.
- Shows report info, per-day status, activities, plans, evaluation,
  documentation, and completion progress.
- Preview reflects the final report layout.

### 4.10 DOCX / PDF Generation

- Generated document must follow the real sample structure (see
  `docs/LOGBOOK_TEMPLATE.docx`). Do not redesign the format.
- The final generated report must preserve the important visual
  characteristics of the actual logbook reference, including:
  - page size and margins
  - font
  - header/logo
  - merged cells
  - table structure
  - table widths
  - heading styles
  - numbering
  - page breaks
  - appendix layout
  - images
  - image captions
- A library that builds DOCX from scratch (e.g. `docx`) must **not** be
  assumed to automatically reproduce the exact template. Visual fidelity must
  be verified, not assumed.
- Before the final document-generation feature ships, require a small
  proof-of-concept that generates one sample weekly report and verifies the
  output remains visually consistent with `docs/LOGBOOK_TEMPLATE.docx`.
- The document-generation approach may be changed if another server-compatible
  approach is technically better (e.g. template-based filling) — provided the
  visual-fidelity gate above still passes.
- DOCX is the primary output.
- PDF is a secondary output (MVP can use browser print-to-PDF or a conversion
  service).

## 5. Non-Functional Requirements

- **Security first.** Server-side authorization on every read/write/export.
  User A must never access User B's data. No secrets in the client. Validate
  uploads. Encrypt stored GitHub tokens.
- **Correctness.** Generated document mirrors the template faithfully.
- **Data integrity.** Daily entries persisted; drafts resumable.
- **Maintainability.** Simple architecture, minimal dependencies, small code.
- **Simplicity.** Private tool for a small group; no over-engineering.
- **UI/UX.** Live-weekly-report feel; clear empty/loading/error/success states.
- **Graceful degradation.** GitHub, AI, Cloudinary failures never block manual
  logbook work.
- **Language.** UI and generated content in Indonesian; code/docs in English.

## 6. MVP Scope

- Email/password auth (register, login, logout).
- Profile: name, NIM, scheme, partner.
- Weekly report CRUD (auto current-week default).
- Daily logs with manual activities, working hours, location, status.
- Resume editing unfinished reports.
- GitHub OAuth connect + repository selection + commit fetch + attach to days
  (optional feature, isolated per user).
- AI draft generation from evidence, editable.
- Photo upload via Cloudinary with preview/delete/caption.
- Live report preview.
- DOCX export matching the template.
- PDF export via client-side print-to-PDF (MVP) or external conversion.

## 7. Out of Scope / Future (Non-MVP)

- Full PDF service (server-side) as a built-in feature.
- Public/social sharing, comments, roles beyond user/admin-of-self.
- Team/collaboration editing.
- Bulk report generation for a whole semester.
- BPMN/ERD tools.
- Notifications/reminders.
- Admin panel for the owner to view others' data (unless explicitly requested).

## 8. Acceptance Notes

- A user with no GitHub connection can complete the entire flow.
- Reports persist and resume correctly.
- The generated DOCX matches the sample layout (A4, margins, fonts, tables,
  numbering, shading, appendix images) **as verified by the pre-generation
  proof-of-concept** (see §4.10).
- Every user-owned resource is verified against the session user server-side.
