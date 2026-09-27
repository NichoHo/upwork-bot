# Proposal Desk

Dashboard for SkyDeck Labs' Upwork job queue. Next.js 16, Tailwind v4,
shadcn/ui, Supabase. See `../BLUEPRINT.md` and `../CLAUDE.md` for the
architecture and the decisions behind it.

## Local development

```bash
npm install
npm run dev
```

Needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
in `.env.local` (not committed).

## Deploy

```bash
vercel deploy --prod
```
