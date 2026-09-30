import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { searchBookings } from "@/lib/calendar-data";
import { searchCustomEvents } from "@/lib/calendar-events";
import type { CalendarPayload } from "@/lib/calendar/types";

export const dynamic = "force-dynamic";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request: NextRequest) {
  const user = await getCurrentSession();
  if (!user) return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 401 });

  const q = (new URL(request.url).searchParams.get("q") || "").trim().slice(0, 80);
  if (q.length < 2) {
    const empty: CalendarPayload = { bookings: [], events: [], pendingCount: 0, serverTime: Date.now() };
    return NextResponse.json(empty);
  }

  try {
    const regex = new RegExp(escapeRegex(q), "i");
    const [bookings, events] = await Promise.all([searchBookings(regex), searchCustomEvents(regex)]);
    const payload: CalendarPayload = { bookings, events, pendingCount: 0, serverTime: Date.now() };
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[calendar search error]", err);
    return NextResponse.json({ error: "Szerver hiba" }, { status: 500 });
  }
}
