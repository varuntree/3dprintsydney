import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/env";
import { getServiceSupabase } from "@/server/supabase/service-client";

const PUBLIC_ROUTES = ["/login", "/signup"];
const MARKETING_ROUTES = [
  "/",
  "/services",
  "/pricing",
  "/about",
  "/contact",
  "/portfolio",
  "/materials",
];
const ACCESS_COOKIE = "sb:token";
const REFRESH_COOKIE = "sb:refresh-token";

function setSessionCookies(response: NextResponse, accessToken: string, refreshToken?: string | null, expiresAt?: number | null) {
  response.cookies.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt ? new Date(expiresAt * 1000) : undefined,
  });
  if (refreshToken) {
    response.cookies.set(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: { persistSession: false },
  });

  let authUser = null;
  if (accessToken) {
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (!error) {
      authUser = data.user;
    } else if (refreshToken) {
      const { data: refreshData } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
      if (refreshData?.session?.access_token) {
        authUser = refreshData.session.user;
        setSessionCookies(response, refreshData.session.access_token, refreshData.session.refresh_token, refreshData.session.expires_at ?? null);
      }
    }
  }

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  const isMarketing = MARKETING_ROUTES.some((route) =>
    pathname === route || pathname.startsWith(route + "/")
  );

  // Allow marketing routes for everyone (authenticated or not)
  if (isMarketing) {
    return response;
  }

  if (!authUser) {
    if (isPublic) {
      return response;
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const service = getServiceSupabase();
  const { data: profile } = await service
    .from("users")
    .select("role, client_id")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  if (!profile) {
    response.cookies.set(ACCESS_COOKIE, "", { path: "/", expires: new Date(0) });
    response.cookies.set(REFRESH_COOKIE, "", { path: "/", expires: new Date(0) });
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isPublic) {
    const homeUrl = profile.role === "ADMIN" ? "/dashboard" : "/client";
    return NextResponse.redirect(new URL(homeUrl, request.url));
  }

  const isClientRoute = pathname.startsWith("/client") || pathname.startsWith("/quick-order");

  if (profile.role === "CLIENT" && !isClientRoute) {
    return NextResponse.redirect(new URL("/client", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)",
  ],
};
