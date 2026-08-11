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

## Docs

- `REQUIREMENTS.md` – product requirements.
- `ARCHITECTURE.md` – system design and flows.
- `ROADMAP.md` – phased plan.
- `docs/` – campus logbook sample and template (reference only).
