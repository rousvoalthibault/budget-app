import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_ID = "budget_app_api_b2ecbb91";
const COOKIE_NAME = "budget_auth";
type Ctx = { params: Promise<{ path: string[] }> };

async function proxy(request: Request, ctx: Ctx): Promise<Response> {
  const { path } = await ctx.params;
  const origUrl = new URL(request.url);
  const pathStr = path.join("/");

  // Read token from: 1) cookie (secure), 2) header (legacy), 3) skip
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(COOKIE_NAME)?.value || "";
  const headerToken = request.headers.get("x-user-token") || "";
  const token = cookieToken || headerToken;

  if (token) {
    origUrl.searchParams.set("_token", token);
  }
  const qs = origUrl.search;
  const url = `${process.env.CODEWORDS_RUNTIME_URI}/run/${BACKEND_ID}/${pathStr}${qs}`;
  const headers: HeadersInit = {
    Authorization: `Bearer ${process.env.CODEWORDS_API_KEY}`,
    "Content-Type": "application/json",
  };
  const opts: RequestInit = { method: request.method, headers };
  if (!["GET", "HEAD", "DELETE"].includes(request.method)) {
    const body = await request.text();
    if (body) opts.body = body;
  }
  try {
    const res = await fetch(url, opts);
    const data = await res.json();
    const response = NextResponse.json(data, { status: res.status });

    // On login/register success: set HttpOnly cookie with the token
    if ((pathStr === "auth/login" || pathStr === "auth/register") && res.ok && data.token) {
      response.cookies.set(COOKIE_NAME, data.token, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    // On logout: clear the cookie
    if (pathStr === "auth/logout") {
      response.cookies.delete(COOKIE_NAME);
    }

    return response;
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 });
  }
}

export const GET    = (req: Request, ctx: Ctx) => proxy(req, ctx);
export const POST   = (req: Request, ctx: Ctx) => proxy(req, ctx);
export const PATCH  = (req: Request, ctx: Ctx) => proxy(req, ctx);
export const PUT    = (req: Request, ctx: Ctx) => proxy(req, ctx);
export const DELETE = (req: Request, ctx: Ctx) => proxy(req, ctx);

