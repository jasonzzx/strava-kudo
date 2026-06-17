import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;

  if (error || !code) {
    return NextResponse.redirect(`${baseUrl}/?error=access_denied`);
  }

  const tokenRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${baseUrl}/?error=token_exchange`);
  }

  const token = await tokenRes.json();

  const response = NextResponse.redirect(`${baseUrl}/`);

  // Store tokens in httpOnly cookies (7-day expiry)
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };

  response.cookies.set("strava_access_token", token.access_token, cookieOpts);
  response.cookies.set("strava_refresh_token", token.refresh_token, cookieOpts);
  response.cookies.set("strava_token_expiry", String(token.expires_at), cookieOpts);
  response.cookies.set(
    "strava_athlete",
    JSON.stringify({
      id: token.athlete?.id,
      name: `${token.athlete?.firstname ?? ""} ${token.athlete?.lastname ?? ""}`.trim(),
      avatar: token.athlete?.profile_medium,
    }),
    { ...cookieOpts, httpOnly: false } // readable by client for display
  );

  return response;
}
