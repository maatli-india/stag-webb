# STAG Web

The web experience for STAG, built with Next.js App Router and TypeScript.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

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
- `/login` login entry point placeholder
- `/signup` registration entry point placeholder

## Structure

- `src/app` contains route pages and the global layout.
- `src/components` contains shared public-site components.
- `public/assets` contains the existing STAG brand assets migrated from `portfolios/stag-website`.

The authenticated web application, API client, session handling, and payment integration will be added behind the public-site shell. Business rules should remain authoritative in the existing STAG backend.