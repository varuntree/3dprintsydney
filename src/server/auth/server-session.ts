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

