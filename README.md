# Movo Privé — mobile apps

iOS + Android apps for Movo Privé, built with Expo (React Native) on the same API as the web app ([movo-web](https://github.com/temmy762/movo-web)). The full plan is in `movo-web/docs/MOBILE_ROADMAP.md`.

| App | Folder | Bundle ID | Deep-link scheme | Status |
|---|---|---|---|---|
| Movo Chauffeur | `apps/chauffeur` | `com.movoprive.chauffeur` | `movochauffeur://` | Phase 0 scaffold |
| Movo Privé (customer) | `apps/customer` | `com.movoprive.app` | — | Phase 3 (not started) |

## Layout

```
apps/chauffeur/      Expo app — routes in src/app (expo-router)
packages/shared/     Files synced from movo-web (socket events, tiers, launch flags, time, Prisma enums) + API types
packages/api/        Typed API client (Bearer token, 20s timeout) + socket.io client
packages/ui/         Design tokens from movo-web globals.css + core components
scripts/sync-shared.mjs
```

## Getting started

Requires Node 20+. Clone this repo next to `movo-web` (the sync script reads `../movo-web`).

```bash
npm install
npm run chauffeur
```

Scan the QR code with a **development build** of the app (Expo Go works only until a library with custom native code is added).

The apps talk to `https://movoprive.com` by default. To point at another server, create `apps/chauffeur/.env.local` containing:

```
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000
```

## Keeping shared code in sync

Never edit the synced files in `packages/shared` by hand. When one of these changes in movo-web:

- `lib/socket/events.ts`
- `lib/normalizeTier.ts`
- `lib/tierLabels.ts`
- `lib/winnipegTime.ts`
- `lib/launchConfig.ts`
- the enums in `prisma/schema.prisma`

do this:

```bash
npm run sync-shared
```

Then commit both repos. `npm run typecheck` runs `check-shared` first and fails if a copy has drifted.

## Checks before committing

```bash
npm run typecheck
```

```bash
cd apps/chauffeur && npx expo-doctor
```
