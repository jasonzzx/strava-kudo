"use client";

import { useEffect, useState, useCallback } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

interface Activity {
  id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  average_speed: number;
  average_heartrate: number | null;
  has_kudoed: boolean;
  athlete: { id: number; firstname: string; lastname: string };
  start_date_local: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const SPORT_EMOJI: Record<string, string> = {
  Run: "🏃", Ride: "🚴", Swim: "🏊", Walk: "🚶", Hike: "🥾",
  VirtualRide: "🚴", VirtualRun: "🏃", WeightTraining: "🏋️",
  Yoga: "🧘", Workout: "💪", Rowing: "🚣", Crossfit: "🏋️",
  Soccer: "⚽", Tennis: "🎾", Golf: "⛳", Skiing: "⛷️",
  Snowboard: "🏂", AlpineSki: "⛷️", NordicSki: "🎿",
  Kayaking: "🛶", Surfing: "🏄", StandUpPaddling: "🏄",
};

function sportEmoji(type: string) { return SPORT_EMOJI[type] ?? "🏅"; }

function fmtDistance(m: number, type: string): string {
  if (!m) return "";
  if (type === "Swim") return `${Math.round(m)}m`;
  const km = m / 1000;
  return km < 10 ? `${km.toFixed(2)}km` : `${km.toFixed(1)}km`;
}

function fmtPace(speed: number, type: string): string {
  if (!speed) return "";
  if (type === "Ride" || type === "VirtualRide")
    return `${(speed * 3.6).toFixed(1)}km/h`;
  if (type === "Swim") {
    const secPer100 = 100 / speed;
    const m = Math.floor(secPer100 / 60);
    const s = Math.round(secPer100 % 60);
    return `${m}:${s.toString().padStart(2, "0")}/100m`;
  }
  const secPerKm = 1000 / speed;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}/km`;
}

function fmtHR(hr: number | null): string { return hr ? `♥${Math.round(hr)}` : ""; }

// ── ActivityRow ───────────────────────────────────────────────────────────────

function ActivityRow({ activity, selected, onToggle, kudoed }: {
  activity: Activity; selected: boolean;
  onToggle: (id: number) => void; kudoed: boolean;
}) {
  const alreadyKudoed = activity.has_kudoed || kudoed;
  return (
    <label className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 cursor-pointer active:bg-orange-50 transition-colors ${alreadyKudoed ? "opacity-50" : ""}`}>
      <input
        type="checkbox" checked={selected} disabled={alreadyKudoed}
        onChange={() => onToggle(activity.id)}
        className="w-5 h-5 accent-orange-500 flex-shrink-0"
      />
      <span className="text-lg flex-shrink-0">{sportEmoji(activity.type)}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1 min-w-0">
          <span className="text-xs text-gray-400 flex-shrink-0">{activity.athlete.firstname}</span>
          <span className="text-sm font-medium text-gray-800 truncate">{activity.name}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 flex-wrap">
          {fmtDistance(activity.distance, activity.type) && <span>{fmtDistance(activity.distance, activity.type)}</span>}
          {fmtPace(activity.average_speed, activity.type) && (<><span className="text-gray-300">·</span><span>{fmtPace(activity.average_speed, activity.type)}</span></>)}
          {fmtHR(activity.average_heartrate) && (<><span className="text-gray-300">·</span><span className="text-red-400">{fmtHR(activity.average_heartrate)}</span></>)}
        </div>
      </div>
      {alreadyKudoed && <span className="text-orange-400 text-lg flex-shrink-0">👊</span>}
    </label>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [kudoed, setKudoed] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [kudoing, setKudoing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [athlete, setAthlete] = useState<{ name: string; avatar: string } | null>(null);
  const [kudoResult, setKudoResult] = useState<{ succeeded: number; failed: number } | null>(null);

  useEffect(() => {
    try {
      const raw = document.cookie.split("; ").find((c) => c.startsWith("strava_athlete="))?.split("=").slice(1).join("=");
      if (raw) setAthlete(JSON.parse(decodeURIComponent(raw)));
    } catch { /* ignore */ }
  }, []);

  const loadFeed = useCallback(async () => {
    setLoading(true); setError(null); setKudoResult(null);
    try {
      const res = await fetch("/api/feed");
      if (res.status === 401) { window.location.href = "/api/auth/strava"; return; }
      if (!res.ok) throw new Error("Failed to load feed");
      const data: Activity[] = await res.json();
      setActivities(data);
      setSelected(new Set(data.filter((a) => !a.has_kudoed).map((a) => a.id)));
    } catch (e) {
      setError((e as Error).message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const eligibleIds = activities.filter((a) => !a.has_kudoed && !kudoed.has(a.id)).map((a) => a.id);
  const allSelected = eligibleIds.length > 0 && eligibleIds.every((id) => selected.has(id));

  function toggleSelectAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(eligibleIds));
  }

  function toggleOne(id: number) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function kudoAll() {
    if (selected.size === 0) return;
    setKudoing(true); setKudoResult(null);
    try {
      const res = await fetch("/api/kudo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityIds: [...selected] }),
      });
      const data = await res.json();
      setKudoed((prev) => new Set([...prev, ...data.succeeded]));
      setSelected(new Set());
      setKudoResult({ succeeded: data.succeeded.length, failed: data.failed.length });
    } catch { setError("Failed to send kudos"); }
    finally { setKudoing(false); }
  }

  // Not logged in
  if (!loading && !error && activities.length === 0 && !athlete) {
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center p-8 gap-6">
        <div className="text-6xl">🏅</div>
        <h1 className="text-2xl font-bold text-gray-800">Strava Kudo</h1>
        <p className="text-gray-500 text-center text-sm">Kudo all your friends&apos; activities in one tap</p>
        <a href="/api/auth/strava" className="bg-orange-500 text-white font-semibold px-8 py-3 rounded-full shadow-lg active:bg-orange-600 transition-colors">
          Connect with Strava
        </a>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white max-w-lg mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
              disabled={loading || eligibleIds.length === 0} className="w-5 h-5 accent-orange-500" />
            <span className="text-sm text-gray-600">
              {selected.size > 0 ? `${selected.size} selected` : "Select All"}
            </span>
          </label>
          <div className="flex items-center gap-3">
            <button onClick={kudoAll} disabled={selected.size === 0 || kudoing || loading}
              className="bg-orange-500 text-white text-sm font-semibold px-4 py-2 rounded-full disabled:opacity-40 active:bg-orange-600 transition-colors">
              {kudoing ? "Kudoing…" : `👊 Kudo${selected.size > 0 ? ` ${selected.size}` : ""}`}
            </button>
            {athlete?.avatar ? (
              <a href="/api/auth/logout" title="Log out">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={athlete.avatar} alt={athlete.name} className="w-8 h-8 rounded-full border-2 border-orange-400" />
              </a>
            ) : (
              <a href="/api/auth/logout" className="text-xs text-gray-400 underline">Logout</a>
            )}
          </div>
        </div>
        {kudoResult && (
          <div className="bg-orange-50 border-t border-orange-100 px-4 py-2 text-sm text-orange-700 flex justify-between items-center">
            <span>👊 {kudoResult.succeeded} kudos sent{kudoResult.failed > 0 && ` · ${kudoResult.failed} failed`}</span>
            <button onClick={() => setKudoResult(null)} className="text-orange-400">✕</button>
          </div>
        )}
      </header>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading feed…</p>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center py-16 gap-4">
          <p className="text-red-500 text-sm">{error}</p>
          <button onClick={loadFeed} className="text-orange-500 text-sm underline">Retry</button>
        </div>
      )}

      {!loading && !error && activities.length === 0 && (
        <div className="flex flex-col items-center py-20 gap-3 text-gray-400">
          <p className="text-4xl">🏜️</p>
          <p className="text-sm">No activities in your feed</p>
          <button onClick={loadFeed} className="text-orange-500 text-sm underline">Refresh</button>
        </div>
      )}

      {!loading && activities.length > 0 && (
        <>
          <ul>
            {activities.map((a) => (
              <li key={a.id}>
                <ActivityRow activity={a} selected={selected.has(a.id)} onToggle={toggleOne} kudoed={kudoed.has(a.id)} />
              </li>
            ))}
          </ul>
          <div className="py-6 flex justify-center">
            <button onClick={loadFeed} className="text-xs text-gray-400 underline">Refresh feed</button>
          </div>
        </>
      )}
    </main>
  );
}
