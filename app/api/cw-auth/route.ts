import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const otk = request.nextUrl.searchParams.get("otk");
  const projectId = request.nextUrl.searchParams.get("project_id");
  const redirect = request.nextUrl.searchParams.get("redirect");

  if (!otk || !projectId || !redirect) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const runtimeUri = process.env.CODEWORDS_RUNTIME_URI;
  if (!runtimeUri) {
    return NextResponse.json(
      { error: "Runtime not configured" },
      { status: 500 }
    );
  }

  try {
    const verifyResp = await fetch(
      `${runtimeUri}/run/ui_builder/auth/verify-preview`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${otk}`,
        },
        body: JSON.stringify({ project_id: projectId }),
      }
    );

    if (!verifyResp.ok) {
      return new NextResponse("Access denied", { status: 403 });
    }

    const data = (await verifyResp.json()) as {
      authorized?: boolean;
      output?: { authorized?: boolean };
    };

    const authorized = data.authorized ?? data.output?.authorized ?? false;

    if (!authorized) {
      return new NextResponse("Access denied — you do not own this project", {
        status: 403,
      });
    }

    const response = NextResponse.redirect(redirect);
    response.cookies.set("cw_preview", "1", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    return response;
  } catch {
    return new NextResponse("Auth verification failed", { status: 500 });
  }
}
