import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const allowedOrigins = [
  "https://codewords.agemo.ai",
  "https://codewords-staging.agemo.ai",
  "http://localhost:3001",
];

export function proxy(request: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/909838ec-bb9e-44e3-9098-1ca1670902f8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'proxy.ts:entry',message:'Proxy function called',data:{method:request.method,url:request.url,pathname:request.nextUrl.pathname},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2-H3'})}).catch(()=>{});
  // #endregion

  const origin = request.headers.get("origin");

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/909838ec-bb9e-44e3-9098-1ca1670902f8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'proxy.ts:origin-check',message:'Origin header value',data:{origin,allowedOrigins},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1-H4'})}).catch(()=>{});
  // #endregion

  const isAllowedOrigin = origin && allowedOrigins.includes(origin);

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/909838ec-bb9e-44e3-9098-1ca1670902f8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'proxy.ts:allowed-check',message:'isAllowedOrigin result',data:{isAllowedOrigin,origin},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

  // Handle preflight OPTIONS request
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": isAllowedOrigin ? origin : "",
        "Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Handle actual request (including HEAD)
  const response = NextResponse.next();

  if (isAllowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, HEAD, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/909838ec-bb9e-44e3-9098-1ca1670902f8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'proxy.ts:headers-set',message:'CORS headers set',data:{origin},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
  } else {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/909838ec-bb9e-44e3-9098-1ca1670902f8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'proxy.ts:headers-skipped',message:'CORS headers NOT set - origin not allowed',data:{origin,isAllowedOrigin},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
  }

  return response;
}

export const config = {
  matcher: "/:path*",
};
