import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("strava_access_token")?.value;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { activityIds } = await req.json() as { activityIds: number[] };

  if (!Array.isArray(activityIds) || activityIds.length === 0) {
    return NextResponse.json({ error: "No activity IDs provided" }, { status: 400 });
  }

  // Strava rate limit: 100 req/15min. We stagger requests slightly.
  const results = await Promise.allSettled(
    activityIds.map(async (id, i) => {
      // 50ms stagger to be polite to Strava's rate limiter
      await new Promise((r) => setTimeout(r, i * 50));
      const res = await fetch(
        `https://www.strava.com/api/v3/activities/${id}/kudos`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error(`Failed to kudo ${id}: ${res.status}`);
      return id;
    })
  );

  const succeeded = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => (r as PromiseFulfilledResult<number>).value);

  const failed = results
    .filter((r) => r.status === "rejected")
    .map((_, i) => activityIds[i]);

  return NextResponse.json({ succeeded, failed });
}
