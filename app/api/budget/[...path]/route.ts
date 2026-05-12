import { NextResponse } from "next/server";

const BACKEND_ID = "budget_app_api_b2ecbb91";
type Ctx = { params: Promise<{ path: string[] }> };

async function proxy(request: Request, ctx: Ctx): Promise<Response> {
  const { path } = await ctx.params;
  const url = `${process.env.CODEWORDS_RUNTIME_URI}/run/${BACKEND_ID}/${path.join("/")}`;
  const userToken = request.headers.get("x-user-token") || "";
  const headers: HeadersInit = {
    Authorization: `Bearer ${process.env.CODEWORDS_API_KEY}`,
    "Content-Type": "application/json",
    ...(userToken ? { "x-user-token": userToken } : {}),
  };
  const opts: RequestInit = { method: request.method, headers };
  if (!["GET", "HEAD", "DELETE"].includes(request.method)) {
    const body = await request.text();
    if (body) opts.body = body;
  }
  try {
    const res = await fetch(url, opts);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend unavailable" }, { status: 502 });
  }
}

export const GET    = (req: Request, ctx: Ctx) => proxy(req, ctx);
export const POST   = (req: Request, ctx: Ctx) => proxy(req, ctx);
export const PATCH  = (req: Request, ctx: Ctx) => proxy(req, ctx);
export const PUT    = (req: Request, ctx: Ctx) => proxy(req, ctx);
export const DELETE = (req: Request, ctx: Ctx) => proxy(req, ctx);

