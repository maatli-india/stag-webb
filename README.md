# STAG Web

The web experience for STAG, built with Next.js App Router and TypeScript.

## Run locally

```bash
npm install
cp .env.example .env.local   # optional — see API base URL below
npm run dev
```

Open `http://localhost:3000`.

## API base URL (Netlify / env)

| Key | Required | Default if unset |
|-----|----------|------------------|
| `NEXT_PUBLIC_API_BASE_URL` | No | `https://api-dev.stag.org.in/stag/v1` |

Must include the `/stag/v1` path. Trailing slash is optional. Blank counts as unset.

**Netlify (two sites or two contexts):** Site settings → Environment variables → set at **build** time (`NEXT_PUBLIC_*` is baked into the client bundle).

| Deploy | Value |
|--------|--------|
| DEV | `https://api-dev.stag.org.in/stag/v1` |
| QA | `https://api-qa.stag.org.in/stag/v1` |

If you omit the variable on a Netlify site, the app keeps pointing at **api-dev**, same as before this change.

## Verify and build

```bash
npm run lint
npm run build
```

## Current routes

- `/` public landing page
- `/about` platform overview
- `/faq` frequently asked questions
- `/privacy` privacy policy
- `/terms` terms and conditions
- `/child-safety` child-safety standards
- `/signup` registration entry point placeholder

## Structure

- `src/app` contains route pages and the global layout.
- `src/components` contains shared public-site components.
- `public/assets` contains the existing STAG brand assets migrated from `portfolios/stag-website`.

The authenticated web application, API client, session handling, and payment integration will be added behind the public-site shell. Business rules should remain authoritative in the existing STAG backend.