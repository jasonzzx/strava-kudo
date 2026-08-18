import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("strava_access_token")?.value;

  if (!token) {
    return NextResponse.json({ hasToken: false });
  }

  // Check token info from Strava
  const athleteRes = await fetch("https://www.strava.com/api/v3/athlete", {
    headers: { Authorization: `Bearer ${token}` },
  });

  // Try own activities (requires activity:read scope)
  const ownRes = await fetch("https://www.strava.com/api/v3/athlete/activities?per_page=1", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const ownBody = await ownRes.text();

  // Try the following feed (requires activity:read scope)
  const feedRes = await fetch("https://www.strava.com/api/v3/activities/following?per_page=1", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const feedBody = await feedRes.text();

  return NextResponse.json({
    hasToken: true,
    tokenPrefix: token.slice(0, 8) + "...",
    athleteStatus: athleteRes.status,
    ownActivitiesStatus: ownRes.status,
    ownActivitiesBody: ownRes.status === 200 ? `${JSON.parse(ownBody).length} activities` : ownBody,
    feedStatus: feedRes.status,
    feedBody: feedRes.status === 200 ? `${JSON.parse(feedBody).length} activities` : feedBody,
  });
}
