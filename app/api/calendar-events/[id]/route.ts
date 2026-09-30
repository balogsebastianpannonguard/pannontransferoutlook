import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit-logs";
import { deleteCustomEvent, parseCustomEventInput, updateCustomEvent } from "@/lib/calendar-events";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentSession();
  if (!user) return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 401 });

  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const parsed = parseCustomEventInput(body, true);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const event = await updateCustomEvent(id, parsed.value);
    if (!event) return NextResponse.json({ error: "Az esemény nem található" }, { status: 404 });

    await createAuditLog({
      timestamp: Date.now(),
      action: "calendar_event.modified",
      actor: user.email,
      targetType: "calendar_event",
      targetId: id,
      details: JSON.stringify({ title: event.title }),
    });
    return NextResponse.json({ event });
  } catch (err) {
    console.error("[calendar-events PATCH error]", err);
    return NextResponse.json({ error: "Szerver hiba" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentSession();
  if (!user) return NextResponse.json({ error: "Nincs jogosultságod" }, { status: 401 });

  try {
    const { id } = await params;
    const deleted = await deleteCustomEvent(id);
    if (!deleted) return NextResponse.json({ error: "Az esemény nem található" }, { status: 404 });

    await createAuditLog({
      timestamp: Date.now(),
      action: "calendar_event.deleted",
      actor: user.email,
      targetType: "calendar_event",
      targetId: id,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[calendar-events DELETE error]", err);
    return NextResponse.json({ error: "Szerver hiba" }, { status: 500 });
  }
}
