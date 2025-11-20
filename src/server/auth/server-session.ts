import { cookies } from "next/headers";
import type { LegacyUser } from "@/lib/types/user";
// Avoid importing from './session' if it imports 'next/server' which might trigger the error?
// No, 'next/server' is safe in Server Components.
// The error "You're importing a component that needs next/headers" usually means:
// 1. A Client Component is importing something that imports 'next/headers'.
// 2. A file in 'pages/' (old router) is importing something that uses 'next/headers'.

// The build error trace says:
// ./src/server/auth/server-session.ts
// ./src/lib/auth-utils.ts
// ./src/app/(admin)/business-guide/page.tsx

// business-guide/page.tsx is an App Router Server Component. It SHOULD support 'next/headers'.
// Why does Next.js complain?
// "That only works in a Server Component which is not supported in the pages/ directory."
// Do I have any file in `pages/`? `src/app` is App Router.
// Maybe `business-guide/page.tsx` is being treated as something else?
// It has `use client`? No, I removed that (or didn't add it).
// Wait, `auth-utils.ts` imports `getUserFromCookies` which imports `cookies`.
// `business-guide/page.tsx` imports `requireAdmin` from `auth-utils`.

// Let's check if `src/lib/auth-utils.ts` is being imported by any Client Component?
// The trace only shows `business-guide/page.tsx`.

// Is `src/server/auth/session.ts` importing `next/headers`? I removed it in the previous step.
// But `src/server/auth/server-session.ts` imports `next/headers`.
// And `src/lib/auth-utils.ts` imports `server-session.ts`.

// If `business-guide/page.tsx` is a Server Component, this should be legal.
// Maybe the error is misleading and `business-guide/page.tsx` is somehow considered a "pages" directory file?
// It is in `src/app/(admin)/business-guide/page.tsx`. `(admin)` is a route group.
// This structure is standard App Router.

// Let's look at `tsconfig.json` or `next.config.ts`?
// Or maybe `src/server/auth/session.ts` still has the import?
// I edited `session.ts` to remove `import { cookies }`.
// I created `server-session.ts` with `import { cookies }`.
// `auth-utils.ts` now imports from `server-session.ts`.

// If `src/app/(admin)/business-guide/page.tsx` imports `requireAdmin` -> `auth-utils` -> `server-session` -> `cookies`.
// This path is valid for Server Components.

// Is it possible `src/lib/auth-utils.ts` is imported by a CLIENT component somewhere else, and webpack is building that dependency graph?
// But the trace specifically mentions `business-guide/page.tsx`.

// Let's check `src/components/business-guide/business-guide-view.tsx`.
// `business-guide/page.tsx` imports `BusinessGuideView`.
// `BusinessGuideView` is likely a Client Component (interactive).
// Does `BusinessGuideView` import `requireAdmin`? No, `page.tsx` does.
// Does `page.tsx` pass `requireAdmin` result to `BusinessGuideView`?
// `await requireAdmin()` is called in `page.tsx`.

// Wait, I noticed `src/app/(admin)/business-guide/page.tsx` imports `requireAdmin` from `@/lib/auth-utils`.
// And `BusinessGuideView` from `@/components/business-guide/business-guide-view`.

// Maybe the error is actually about `src/server/auth/session.ts`?
// The error message says `./src/server/auth/server-session.ts`.
// It says "You're importing a component that needs next/headers... not supported in the pages/ directory."
// Is there ANY file in `pages/`?
// `ls -R` didn't show a `pages` directory at root.
// `src/pages`?
// `ls src` showed `app`, `components`, `hooks`, `lib`, `providers`, `server`, `stores`, `styles`, `types`, `workers`.
// No `pages` directory.

// This error is extremely confusing if there is no `pages` directory.
// UNLESS... `src/app/(admin)/business-guide/page.tsx` is somehow being treated as a Page in the Pages Router sense? No.

// Let's try to make `server-session.ts` "use server"? No, that's for actions.
// Maybe `import { cookies } from "next/headers"` is the issue in a file that is not explicitly an async Server Component?
// `getUserFromCookies` is async.

// Let's try to dynamic import `cookies`?
// `const { cookies } = await import("next/headers");`

import type { LegacyUser } from "@/lib/types/user";
import { 
  getAuthUserFromTokens, 
  loadLegacyUser, 
  type CookieStore 
} from "./session";

const ACCESS_COOKIE = "sb:token";
const REFRESH_COOKIE = "sb:refresh-token";

export async function getUserFromCookies(): Promise<LegacyUser | null> {
  const { cookies } = await import("next/headers");
  const cookieStore = (await cookies()) as unknown as CookieStore;
  
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  const { user: authUser } = await getAuthUserFromTokens(accessToken, refreshToken);

  if (!authUser) {
    return null;
  }

  return loadLegacyUser(authUser.id);
}

