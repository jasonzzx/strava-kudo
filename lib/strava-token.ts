import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function getValidAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("strava_access_token")?.value;
  const refreshToken = cookieStore.get("strava_refresh_token")?.value;
  const expiry = cookieStore.get("strava_token_expiry")?.value;

  if (!accessToken || !refreshToken) return null;

  // If token is still valid (with 5 min buffer), return it
  const expiresAt = parseInt(expiry ?? "0", 10);
  if (Date.now() / 1000 < expiresAt - 300) {
    return accessToken;
  }

  // Refresh the token
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();

  // Update cookies with new tokens — returned in API response headers
  // Caller must use the NextResponse helper below
  return data.access_token;
}

export function unauthorizedRedirect() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}
