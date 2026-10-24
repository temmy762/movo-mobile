# movo-mobile — project instructions

Expo (React Native) monorepo for the Movo Privé mobile apps. The backend is the existing movo-web Next.js app; the apps use its API and Socket.IO server unchanged. Roadmap: `../movo-web/docs/MOBILE_ROADMAP.md`.

Also read `apps/chauffeur/AGENTS.md` (Expo's own rules). Expo changes every SDK, so check the versioned docs for the installed `expo` major before using any Expo or React Native API.

## Rules

- Install native/Expo libraries with `npx expo install <pkg>` from inside the app folder, never plain `npm install`.
- Routes live in `apps/<app>/src/app/`. Non-route code goes in `src/lib`, `src/components`, or a shared package.
- `packages/shared` synced files are generated: change them in movo-web, then run `npm run sync-shared`.
- Socket event names come only from `SOCKET_EVENTS` in `@movo/shared`. Never use string literals.
- All HTTP goes through `request()` in `@movo/api`. It sends `X-Movo-Client: mobile` and the Bearer token, and it times out after 20s.
- The session token lives in expo-secure-store only.
- Colours, fonts and radii come from `@movo/ui` tokens, which mirror movo-web `app/globals.css`. Don't hard-code brand colours in screens.
- Care (Safe Ride) bookings stay isolated. Chauffeurs receive them only through the Care events and endpoints, as on the web.
- Never commit `ios/`, `android/`, `.env*` or signing files.
- TypeScript strict. 2-space indentation. Follow the patterns of the file you're editing.
- Before declaring work done, run `npm run typecheck` and `npx expo-doctor` in the app folder.
