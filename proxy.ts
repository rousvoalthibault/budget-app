import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED_ORIGINS = [
  "https://codewords.agemo.ai",
  "https://codewords-staging.agemo.ai",
  "http://localhost:3001",
];

const FRAME_ANCESTORS =
  "'self' *.agemo.ai *.codewords.run *.ngrok.app localhost:3001";

const isAllowedOrigin = (origin: string | null): boolean => {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.endsWith(".ngrok.app")) return true;
  if (origin.endsWith(".codewords.run")) return true;
  return false;
};

const SKIP_PATHS = ["/_next", "/favicon.ico", "/health", "/api/health"];

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Skip token check for static assets and health endpoints
  if (SKIP_PATHS.some((p) => pathname.startsWith(p))) {
    return addSecurityHeaders(NextResponse.next(), request);
  }

  const accessToken = process.env.CODEWORDS_ACCESS_TOKEN;

  // If no token configured, allow all access (backwards compatibility)
  if (!accessToken) {
    return addSecurityHeaders(NextResponse.next(), request);
  }

  // Check for token in query param (first visit from iframe)
  const queryToken = searchParams.get("cw_token");
  if (queryToken === accessToken) {
    // Valid token — set cookie and redirect to clean URL
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.searchParams.delete("cw_token");
    const response = NextResponse.redirect(cleanUrl);
    response.cookies.set("cw_access", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    return addSecurityHeaders(response, request);
  }

  // Check for token in cookie (subsequent requests)
  const cookieToken = request.cookies.get("cw_access")?.value;
  if (cookieToken === accessToken) {
    return addSecurityHeaders(NextResponse.next(), request);
  }

  // No valid token — block access
  return new NextResponse("Access denied", { status: 403 });
}

function addSecurityHeaders(
  response: NextResponse,
  request: NextRequest
): NextResponse {
  const origin = request.headers.get("origin");

  // CORS headers
  if (origin && isAllowedOrigin(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, HEAD, POST, PUT, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
  }

  // Handle preflight
  if (request.method === "OPTIONS" && origin && isAllowedOrigin(origin)) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods":
          "GET, HEAD, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Frame-ancestors CSP
  response.headers.set(
    "Content-Security-Policy",
    `frame-ancestors ${FRAME_ANCESTORS}`
  );

  return response;
}

export const config = {
  matcher: "/:path*",
};
