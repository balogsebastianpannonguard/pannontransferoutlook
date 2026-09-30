import { ObjectId, type Filter } from "mongodb";
import { getMongoDb } from "./mongodb";
import { TONE_IDS } from "./calendar/tones";
import { isValidYmd } from "./calendar/dates";
import type { CustomEventDTO, CustomEventKind, ToneId } from "./calendar/types";

const COLLECTION_NAME = "calendar_events";

interface CalendarEventDoc {
  _id?: ObjectId;
  title: string;
  kind: CustomEventKind;
  allDay: boolean;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  driverName?: string;
  notes?: string;
  tone?: ToneId;
  createdBy?: string;
  createdAt: number;
  updatedAt: number;
}

export type CustomEventInput = Omit<CustomEventDTO, "id" | "createdAt" | "createdBy">;

async function collection() {
  const db = await getMongoDb();
  return db.collection<CalendarEventDoc>(COLLECTION_NAME);
}

function toDTO(doc: CalendarEventDoc): CustomEventDTO {
  return {
    id: String(doc._id),
    title: doc.title,
    kind: doc.kind,
    allDay: doc.allDay,
    startDate: doc.startDate,
    endDate: doc.endDate,
    startTime: doc.startTime,
    endTime: doc.endTime,
    driverName: doc.driverName,
    notes: doc.notes,
    tone: doc.tone,
    createdBy: doc.createdBy,
    createdAt: doc.createdAt,
  };
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function parseCustomEventInput(
  body: Record<string, unknown>,
  partial = false
): { ok: true; value: Partial<CustomEventInput> } | { ok: false; error: string } {
  const value: Partial<CustomEventInput> = {};

  if (!partial || body.title !== undefined) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title || title.length > 120) return { ok: false, error: "A cím kötelező (max. 120 karakter)." };
    value.title = title;
  }
  if (!partial || body.kind !== undefined) {
    if (body.kind !== "leave" && body.kind !== "event") return { ok: false, error: "Érvénytelen típus." };
    value.kind = body.kind;
  }
  if (!partial || body.allDay !== undefined) {
    value.allDay = body.allDay === true;
  }
  if (!partial || body.startDate !== undefined) {
    if (!isValidYmd(body.startDate)) return { ok: false, error: "Érvénytelen kezdő dátum." };
    value.startDate = body.startDate;
  }
  if (!partial || body.endDate !== undefined) {
    const end = body.endDate ?? body.startDate;
    if (!isValidYmd(end)) return { ok: false, error: "Érvénytelen záró dátum." };
    value.endDate = end;
  }
  for (const key of ["startTime", "endTime"] as const) {
    if (body[key] === undefined || body[key] === null || body[key] === "") continue;
    if (typeof body[key] !== "string" || !TIME_RE.test(body[key] as string)) {
      return { ok: false, error: "Érvénytelen időpont." };
    }
    value[key] = body[key] as string;
  }
  if (body.driverName !== undefined) {
    const name = typeof body.driverName === "string" ? body.driverName.trim() : "";
    if (name.length > 80) return { ok: false, error: "A sofőr neve túl hosszú." };
    value.driverName = name || undefined;
  }
  if (body.notes !== undefined) {
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    if (notes.length > 1000) return { ok: false, error: "A megjegyzés túl hosszú." };
    value.notes = notes || undefined;
  }
  if (body.tone !== undefined && body.tone !== null && body.tone !== "") {
    if (!TONE_IDS.includes(body.tone as ToneId)) return { ok: false, error: "Érvénytelen szín." };
    value.tone = body.tone as ToneId;
  }

  const start = value.startDate ?? undefined;
  const end = value.endDate ?? undefined;
  if (start && end && end < start) return { ok: false, error: "A záró dátum nem lehet korábbi a kezdőnél." };
  if (value.allDay === false && !partial && !value.startTime) {
    return { ok: false, error: "Időponthoz kezdő idő szükséges." };
  }
  return { ok: true, value };
}

export async function listCustomEvents(from: string, to: string): Promise<CustomEventDTO[]> {
  const col = await collection();
  const docs = await col.find({ startDate: { $lte: to }, endDate: { $gte: from } }).sort({ startDate: 1 }).toArray();
  return docs.map(toDTO);
}

export async function searchCustomEvents(regex: RegExp): Promise<CustomEventDTO[]> {
  const col = await collection();
  const filter: Filter<CalendarEventDoc> = {
    $or: [{ title: regex }, { driverName: regex }, { notes: regex }],
  };
  const docs = await col.find(filter).sort({ startDate: -1 }).limit(40).toArray();
  return docs.map(toDTO);
}

export async function createCustomEvent(input: CustomEventInput, actor: string): Promise<CustomEventDTO> {
  const col = await collection();
  const now = Date.now();
  const doc: CalendarEventDoc = {
    ...input,
    endDate: input.endDate || input.startDate,
    createdBy: actor,
    createdAt: now,
    updatedAt: now,
  };
  const res = await col.insertOne(doc);
  return toDTO({ ...doc, _id: res.insertedId });
}

export async function updateCustomEvent(
  id: string,
  patch: Partial<CustomEventInput>
): Promise<CustomEventDTO | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await collection();
  const unset: Record<string, ""> = {};
  const set: Record<string, unknown> = { updatedAt: Date.now() };
  for (const [key, val] of Object.entries(patch)) {
    if (val === undefined) unset[key] = "";
    else set[key] = val;
  }
  const res = await col.findOneAndUpdate(
    { _id: new ObjectId(id) },
    Object.keys(unset).length ? { $set: set, $unset: unset } : { $set: set },
    { returnDocument: "after" }
  );
  return res ? toDTO(res) : null;
}

export async function deleteCustomEvent(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const col = await collection();
  const res = await col.deleteOne({ _id: new ObjectId(id) });
  return res.deletedCount > 0;
}
