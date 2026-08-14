# Security Review

Audit conducted on the internship logbook application after Phase 7 (DOCX export) and before/alongside the hardening changes in this phase. All findings below were verified against the actual code, not by assumption.

## Threat model summary

- The app holds internship student profiles, weekly reports, daily logs, GitHub evidence (commit data), photo documentation, and an encrypted GitHub access token per user.
- Authentication is email/password via Auth.js `Credentials` provider; the JWT session carries only `{ id, name, email }`.
- Integrations: GitHub OAuth (repo/commit evidence), an OpenAI-compatible LLM endpoint (AI draft descriptions), and Cloudinary (photo uploads). All three are optional and activate only when the relevant secrets are configured.
- Data access is scoped per user through `lib/reports.ts`, `lib/photos.ts`, `lib/github-data.ts`, `lib/ai-data.ts`, and `lib/preview.ts`. All lookups filter by `userId`.

## Findings

| # | Severity | Area | Finding | Status |
|---|----------|------|---------|--------|
| 1 | High | GitHub OAuth | **No `Secure` flag on `github_oauth_state` cookie**: `app/api/github/connect/route.ts` set the state cookie without `secure: true`, so it could be sent over plain HTTP in production. | Fixed |
| 2 | High | GitHub OAuth | **State cookie never cleared on failures and not bound to user**: `app/api/github/callback/route.ts` only deleted the cookie on success; failure paths left it set (it is a replayable, browser-persistent value compared as a string and maxAge is not enforced server-side). Cookie read was a raw header regex instead of `request.cookies`. | Fixed |
| 3 | High | GitHub OAuth | **GitHub account not bound to the app user**: the callback never checked `GitHubConnection.githubUserId`; the same GitHub account could be connected to a second app user (schema has no unique constraint on `githubUserId`), and a user holding another user's active state cookie could bind their GitHub account to the attacker's app session. | Fixed |
| 4 | Medium | API contract | **Route handlers used `requireUser()` (NEXT_REDIRECT) instead of `getCurrentUser()` (JSON 401)**: `app/api/ai/generate/route.ts`, `app/api/github/repos/route.ts`, `app/api/github/commits/route.ts` returned a redirect to `/login` for unauthenticated API callers instead of a machine-readable `401` JSON. | Fixed |
| 5 | Medium | Input validation | **Unbounded input strings on API routes**: AI route read `reportId`/`date` with no length cap and no request body size guard; GitHub commits route accepted unbounded `repositoryId`, `since`, `until` and `page`/`perPage` that could parse to `NaN` (broken GitHub request). | Fixed |
| 6 | Medium | Caching | **Missing `Cache-Control` on authenticated endpoints**: DOCX export and GitHub repos/commits responses could be stored by shared proxies/browsers, risking cross-user content leakage via caches. | Fixed |
| 7 | Medium | Upload validation | **Photo upload bypassed caption length limit**: `app/api/photos/route.ts` accepted an unbounded `caption` while the caption-save action enforced the 300-character `photoCaptionSchema`. | Fixed |
| 8 | Medium | Provider response | **GitHub API responses not shape/content-type validated**: `lib/github.ts` casts `res.json()` without checking `Content-Type`/shape; malformed provider body surfaces as generic `SyntaxError`/`TypeError`. Acceptable — all callers catch and map to generic 500/502 — but provider responses are trusted by construction. | Accepted |
| 9 | Low | Error handling | Error `message` fields from GitHub/Cloudinary/AI are surfaced. Safe: messages are fixed Indonesian text or provider-defined; no secrets/stack traces leak. | Verified |
| 10 | Low | Rate limiting | **No rate limiting** on login, AI generation, or export endpoints. Auth.js login has no per-IP throttle. Production deployment should add one (ROADMAP item 10 explicitly defers this). | Known limitation |
| 11 | Low | Secrets boundary | Enforced: `process.env` appears only in server `lib` modules (`ai.ts`, `cloudinary.ts`, `encrypt.ts`, `github.ts`, `prisma.ts`); no secret in any component/`.tsx`; `.env*` git-ignored except `.env.example` (placeholders). No token reached client HTML (verified by E2E `no token in client HTML`). | Verified |
| 12 | Low | AI bounds | Evidence sent to the LLM is bounded by DB schema and `lib/ai-data.ts` collects only owned daily-log data; no unbounded runtime prompt cap. ROADMAP 5 defers richer evidence verification. | Known limitation |
| 13 | Low | Upload pipeline | Cloudinary upload happens before the DB row insert; if `addPhotoForUser` fails the remote asset becomes orphaned (no destructive action, only wasted storage). | Known limitation |
| 14 | Info | Transport | Deployment to Vercel serves over HTTPS; the OAuth callback endpoint will be reachable over HTTPS only. `connect` sets `secure` when `NODE_ENV === "production"`. | Verified |

## Verified-correct areas (no change needed)

- **Ownership enforcement**: every data path scopes by `userId` — reports (`getReportForUser`, `getReportPreviewForUser`), photos (`listPhotosForReport`, `requireOwnedPhoto`, `addPhotoForUser`, `reorderPhotosForUser`), GitHub (repository `id + userId`, commit attachment requires both owned repo and owned report), AI (owned report + owned daily log). Foreign users get 404, verified in E2E.
- **Export route**: `getCurrentUser()` → 401; unknown/foreign report → 404 (covered by `verify-docgen.mjs` 9/9).
- **Photo upload**: `app/api/photos/route.ts` checks authenticated user, report ownership, file size (`MAX_PHOTO_BYTES` 8 MiB), and magic bytes (JPEG/PNG/WebP); uploads are signed server-side; Cloudinary secret never reaches the browser.
- **Session**: no user-derived secrets in the JWT; bcrypt cost 12; session stripped of `passwordHash`.
- **Secrets**: AES-256-GCM (SHA-256-derived key) encrypts GitHub tokens at rest; `ENCRYPTION_KEY` and `AUTH_SECRET` required, placeholders only in `.env.example`.

## Fixes applied in this phase

1. `app/api/github/connect/route.ts` — added `secure: true` in production to the OAuth state cookie.
2. `app/api/github/callback/route.ts`:
   - reads the state cookie via `request.cookies`;
   - clears the cookie on every return path (success, `oauth_failed`, `not_configured`, `oauth_account_in_use`);
   - checks that `githubUserId` is not already bound to a different app user; if it is, redirects with `error=oauth_account_in_use`.
3. Added `findConnectionByGithubUserId` to `lib/github-data.ts`.
4. `app/api/ai/generate/route.ts`, `app/api/github/repos/route.ts`, `app/api/github/commits/route.ts` — replaced `requireUser()` with `getCurrentUser()` returning `401` JSON; added a 64 KiB request-body cap and string length limits (AI), and finite `page`/`perPage` sanitization plus `repositoryId`/date length guards (GitHub commits).
5. Added `Cache-Control: private, no-store` to DOCX export (success) and all GitHub repos/commits JSON responses.
6. `app/api/photos/route.ts` — rejects captions longer than 300 characters (aligned with `photoCaptionSchema`).

## Verification

- `npm test`: 61/61 pass (added `tests/security.test.ts`, 10 tests).
- `npm run lint`: clean. `npx tsc --noEmit`: clean. `npm run build`: clean.
- E2E (Playwright + local mocks): `verify-phase2` 36/36, `verify-github` 31/31, `verify-ai` 19/19, `verify-photos` 25/25, `verify-preview` 40/40, `verify-docgen` 9/9.
- Manual API checks: `/api/github/repos`, `/api/github/commits`, `/api/ai/generate`, `/api/photos`, `/api/reports/{id}/export` all return `401` for unauthenticated callers (previously `NEXT_REDIRECT`/redirect for the data routes).

## Known limitations (accepted)

- No rate limiting (login, AI generation, export) — deferred by ROADMAP item 10.
- GitHub provider responses are parsed without a strict response-schema guard.
- Orphaned Cloudinary assets possible if the DB insert fails after a successful upload.
- LLM prompt size is bounded by schema but not by an explicit runtime cap.