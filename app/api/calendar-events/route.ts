import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit-logs";
import { createCustomEvent, parseCustomEventInput, type CustomEventInput } from "@/lib/calendar-events";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getCurrentSession();
  if (!user) return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 401 });

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const parsed = parseCustomEventInput(body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const event = await createCustomEvent(parsed.value as CustomEventInput, user.email);
    await createAuditLog({
      timestamp: Date.now(),
      action: "calendar_event.created",
      actor: user.email,
      targetType: "calendar_event",
      targetId: event.id,
      details: JSON.stringify({ title: event.title, kind: event.kind }),
    });
    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    console.error("[calendar-events POST error]", err);
    return NextResponse.json({ error: "Szerver hiba" }, { status: 500 });
  }
}
