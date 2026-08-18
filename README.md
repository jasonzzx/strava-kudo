# Strava Kudo

[![CI](https://github.com/jasonzzx/strava-kudo/actions/workflows/ci.yml/badge.svg)](https://github.com/jasonzzx/strava-kudo/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Give kudos to your whole Strava following feed in one tap, instead of scrolling and
tapping one activity at a time.

Two ways to run it:

- **Web app** — a Next.js app that authenticates through Strava's OAuth flow and drives
  the official v3 API.
- **Bookmarklet** — a zero-install variant that runs directly on `strava.com` against your
  existing session, for when you do not want to register an API application at all.

## How it works

### Web app

1. `GET /api/auth/strava` redirects to Strava's OAuth consent screen.
2. `GET /api/auth/callback` exchanges the code for an access token and stores it in an
   HTTP-only cookie — the token is never exposed to client-side JavaScript.
3. `GET /api/feed` proxies `activities/following`, then slims the payload down to only the
   fields the UI renders (id, name, sport type, distance, moving time, average speed and
   heart rate, `has_kudoed`, athlete).
4. `POST /api/kudo` takes the selected activity IDs and fans out kudos requests. Strava
   allows 100 requests per 15 minutes, so requests are staggered ~50 ms apart and issued
   with `Promise.allSettled`, returning explicit `succeeded` / `failed` lists rather than
   failing the whole batch on one bad ID.

The UI pre-selects every activity you have not already kudoed, renders sport-appropriate
emoji, and formats pace per sport — min/km for runs, km/h for rides, min/100m for swims.
Already-kudoed rows are dimmed and disabled.

### Bookmarklet

`bookmarklet/strava-kudo.js` injects an overlay onto strava.com listing recent activities
with a checkbox per row, a "select all unkudoed" control, and a bulk kudo button. It uses
Strava's own internal web endpoints via the page's session cookie and CSRF meta tag — no
credentials are read, stored, or transmitted anywhere except strava.com itself.

Build the one-line bookmarklet with:

```bash
node bookmarklet/build.js
```

## Local development

```bash
npm install
npm run dev       # http://localhost:3000
npm run build     # production build
npx tsc --noEmit  # type check
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| `STRAVA_CLIENT_ID` | Strava API application client ID |
| `STRAVA_CLIENT_SECRET` | Strava API application client secret |
| `STRAVA_REDIRECT_URI` | OAuth callback URL, e.g. `http://localhost:3000/api/auth/callback` |

Create an API application at https://www.strava.com/settings/api to obtain the ID and
secret. The app requests the `activity:read` scope, which is what the following feed and
the kudos endpoint require.

## Project structure

```
app/
  page.tsx                    # Feed UI — selection state, bulk kudo action
  api/
    auth/strava/route.ts      # → Strava OAuth consent redirect
    auth/callback/route.ts    # Code → token exchange, sets HTTP-only cookie
    auth/logout/route.ts      # Clears the session cookie
    feed/route.ts             # Proxies activities/following, slims the payload
    kudo/route.ts             # Staggered bulk kudos fan-out
    health/route.ts           # Liveness probe
    debug/route.ts            # Scope/permission diagnostics
lib/
  strava-token.ts             # Token refresh helpers
bookmarklet/
  strava-kudo.js              # Overlay script
  build.js                    # Minifies into a javascript: bookmarklet URL
```

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Strava v3 API (OAuth2)

## License

MIT — see [LICENSE](LICENSE).
