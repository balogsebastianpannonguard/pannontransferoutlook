import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { countPendingBookings, listBookingsInRange } from "@/lib/calendar-data";
import { listCustomEvents } from "@/lib/calendar-events";
import { diffDays, isValidYmd, parseYmd } from "@/lib/calendar/dates";
import type { CalendarPayload } from "@/lib/calendar/types";

export const dynamic = "force-dynamic";

const MAX_RANGE_DAYS = 500;

export async function GET(request: NextRequest) {
  const user = await getCurrentSession();
  if (!user) return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!isValidYmd(from) || !isValidYmd(to) || to < from) {
    return NextResponse.json({ error: "Érvénytelen időszak" }, { status: 400 });
  }
  if (diffDays(parseYmd(to), parseYmd(from)) > MAX_RANGE_DAYS) {
    return NextResponse.json({ error: "Túl nagy időszak" }, { status: 400 });
  }

  try {
    const [bookings, events, pendingCount] = await Promise.all([
      listBookingsInRange(from, to),
      listCustomEvents(from, to),
      countPendingBookings(),
    ]);
    const payload: CalendarPayload = { bookings, events, pendingCount, serverTime: Date.now() };
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[calendar GET error]", err);
    return NextResponse.json({ error: "Szerver hiba" }, { status: 500 });
  }
}
