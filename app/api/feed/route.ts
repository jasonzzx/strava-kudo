import { NextRequest, NextResponse } from "next/server";
import { getValidAccessToken, unauthorizedRedirect } from "@/lib/strava-token";

export async function GET(req: NextRequest) {
  const token = await getValidAccessToken();
  if (!token) return unauthorizedRedirect();

  const page = req.nextUrl.searchParams.get("page") ?? "1";
  const perPage = req.nextUrl.searchParams.get("per_page") ?? "30";

  const res = await fetch(
    `https://www.strava.com/api/v3/activities/following?page=${page}&per_page=${perPage}`,
    {
      headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-store" },
    }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to fetch feed" },
      { status: res.status }
    );
  }

  const activities = await res.json();

  // Slim down the payload — only what the UI needs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const feed = activities.map((a: any) => ({
    id: a.id,
    name: a.name,
    type: a.sport_type ?? a.type,
    distance: a.distance,           // metres
    moving_time: a.moving_time,     // seconds
    average_speed: a.average_speed, // m/s
    average_heartrate: a.average_heartrate ?? null,
    has_kudoed: a.has_kudoed,
    athlete: {
      id: a.athlete?.id,
      firstname: a.athlete?.firstname,
      lastname: a.athlete?.lastname,
    },
    start_date_local: a.start_date_local,
  }));

  return NextResponse.json(feed);
}
