# Internship Logbook

Private web app for the author and friends to build their internship (magang)
logbook: submit weekly reports, daily logs, and manual activities, and export
the finished report as a DOCX matching the campus template.

## Stack

- Next.js (App Router) + React + TypeScript + Tailwind CSS
- PostgreSQL on Neon, accessed via Prisma (Prisma 7, `prisma-client` generator)
- Auth.js (NextAuth v5) with Credentials provider, JWT session strategy
- bcryptjs for password hashing, zod for validation

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy `.env.example` to `.env.local` and fill in real values:

- `DATABASE_URL` – pooled Neon connection string (used at runtime).
- `DIRECT_URL` – direct Neon connection string (used by the Prisma CLI).
- `AUTH_SECRET` – `npx auth secret` output; signs/encrypts session cookies.

`.env.local` is git-ignored and never committed.

## Database

```bash
npx prisma migrate dev      # apply schema changes locally
npx prisma migrate status   # check migration state
npx prisma generate         # regenerate the client into generated/prisma
```

## Scripts

- `npm run dev` – development server.
- `npm run build` / `npm start` – production build and server.
- `npm run lint` – ESLint.
- `npx tsc --noEmit` – type check.
- `npx tsx scripts/verify-auth.ts` – end-to-end auth/db assertions against the
  live database (must have `.env.local` set).

## Deploying to Vercel

1. Push this repository to GitHub (`main` branch).
2. Import the repo in the [Vercel dashboard](https://vercel.com/new).
   Framework preset: **Next.js**; build command defaults are fine
   (`npm install` runs `prisma generate` via the `postinstall` script).
3. Add the production **Environment Variables** listed in `.env.example`
   (names and how to obtain each value are described there).
4. Run migrations against the production database:
   `npx prisma migrate deploy` (uses `DIRECT_URL`).
5. Configure external services for production:
   - **GitHub OAuth App**: register at
     https://github.com/settings/developers with callback URL
     `https://<your-domain>/api/github/callback`.
   - **Cloudinary**: cloud name / API key / API secret from the dashboard.
   - **AI provider**: an OpenAI-compatible `/chat/completions` endpoint
     (`AI_API_KEY`, `AI_API_URL`, `AI_MODEL`).
6. `AUTH_SECRET` and `ENCRYPTION_KEY` must be random values, e.g.
   `openssl rand -base64 32`. Never share them.
7. Smoke-test: register/login, create a weekly report and daily log, generate
   an AI draft, connect GitHub, upload a photo, and export a DOCX.

### Runtime caution

The app calls external services (GitHub OAuth, Cloudinary, the AI provider)
from the Vercel runtime. Keep those integrations optional: when a credential
is missing the UI still degrades gracefully and manual workflows keep working.

## Docs

- `REQUIREMENTS.md` – product requirements.
- `ARCHITECTURE.md` – system design and flows.
- `ROADMAP.md` – phased plan.
- `docs/` – campus logbook sample and template (reference only).
