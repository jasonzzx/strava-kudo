import { NextResponse } from "next/server";

export async function GET() {
  const response = NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_BASE_URL}/`
  );
  response.cookies.delete("strava_access_token");
  response.cookies.delete("strava_refresh_token");
  response.cookies.delete("strava_token_expiry");
  response.cookies.delete("strava_athlete");
  return response;
}
