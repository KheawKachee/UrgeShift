# Luma

Luma is a Next.js prototype for **UrgeShift**: a Thai-primary, privacy-first urge interruption app.

Core idea:
- one-tap `Shift Now`
- one safer next move
- minimal typing during an urge moment
- optional richer context before or after the moment

## Product Surfaces

- `/` — `Shift` private session
- `/context` — `ภูติ` background quiz
- `/preview` — Better Self Preview
- `/plans` — saved plans + print flow
- `/progress` — local-only progress, check-ins, and demo metrics

## Stack

- Next.js App Router
- React 19
- local browser storage for privacy-first user state
- dynamic API routes under `app/api/*`
- root Python `api/*` functions kept Vercel-compatible

## Local Development

Install:

```bash
npm install
```

Run dev server:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Start production build locally:

```bash
npm run start
```

## Environment Variables

Optional LLM-backed features use Typhoon-compatible env vars:

```bash
TYPHOON_API_KEY=...
TYPHOON_BASE_URL=https://api.opentyphoon.ai/v1
TYPHOON_MODEL=typhoon-v2.5-30b-a3b-instruct
```

Recommended local setup:

```bash
nano .env.local
```

If no API key is present, the app falls back to rule-based behavior.

## Tests

Backend plan engine tests:

```bash
npm test
```

Vercel Python API smoke test:

```bash
npm run test:vercel-api
```

## Deployment

This repo is set up for Vercel:

- `vercel.json` uses the Next.js framework build
- `app/api/*` provides Next server routes
- root `api/` is packaged for Vercel Python function compatibility

Before deploy, verify:

```bash
rm -rf .next
npm run build
npm test
npm run test:vercel-api
```

## Important Product Constraints

- Thai-primary UI
- no clinical claims
- privacy-first by default
- saved plans should avoid raw sensitive transcript storage
- `Progress` is local-device memory, not backend identity

See [CONTEXT.md](/home/kheaw/projects/luma/CONTEXT.md) for domain language and product rules.
