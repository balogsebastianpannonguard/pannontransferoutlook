import { resolvePartnerMeta } from "@/lib/partner-meta";
import { addDays, diffDays, parseYmd, startOfDay, ymd } from "./dates";
import { estimateTripMinutes, normalizeText, resolvePlace } from "./places";
import { PARTNER_TONES } from "./tones";
import type { CalEvent, CalendarBooking, CalendarFilters, CustomEventDTO, ToneId } from "./types";

export function partnerOf(b: Pick<CalendarBooking, "portal" | "companyName" | "travelerEmail" | "userEmail">) {
  return resolvePartnerMeta({
    portal: b.portal,
    companyName: b.companyName,
    travelerEmail: b.travelerEmail,
    userEmail: b.userEmail,
  });
}

export function shortVehicle(name?: string): string {
  if (!name) return "";
  const trimmed = name.replace(/\(.*?\)/g, "").trim();
  const short = trimmed
    .replace(/^(toyota|skoda|škoda|mercedes-benz|mercedes|ford|opel)\s+/i, "")
    .replace(/\b(kombi|újabb|régebbi|verso|személyes|kisbusz|barna|szürke)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return !short || /^\d+$/.test(short) ? trimmed || name : short;
}

export function driverGivenName(name?: string): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] || "";
}

function clientLabel(b: CalendarBooking): string {
  const meta = partnerOf(b);
  if (meta) return meta.short.toUpperCase();
  if (b.companyName) return b.companyName;
  return b.travelerName.trim().split(/\s+/).slice(0, 2).join(" ");
}

export function bookingRoute(b: Pick<CalendarBooking, "fromAddress" | "toAddress">) {
  const from = resolvePlace(b.fromAddress);
  const to = resolvePlace(b.toAddress);
  return { from, to, label: `${from.short}-${to.short}`, minutes: estimateTripMinutes(from, to) };
}

function parseLocal(date: string, time: string): number {
  const day = parseYmd(date);
  const match = /^(\d{1,2}):(\d{2})/.exec(time || "");
  const h = match ? Math.min(23, Number(match[1])) : 0;
  const m = match ? Math.min(59, Number(match[2])) : 0;
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m).getTime();
}

export function bookingToEvent(b: CalendarBooking): CalEvent {
  const route = bookingRoute(b);
  const start = parseLocal(b.pickupDate, b.pickupTime);
  const end = start + route.minutes * 60_000;
  const meta = partnerOf(b);
  const tone: ToneId = (meta && PARTNER_TONES[meta.id]) || "sky";
  const title = [
    clientLabel(b),
    route.label,
    shortVehicle(b.vehicleName),
    driverGivenName(b.driverName),
  ]
    .filter(Boolean)
    .join(" ");
  const cancelled = b.status === "cancelled";
  const subtitle = `${b.fromAddress} → ${b.toAddress}`;

  return {
    key: `b:${b.id}`,
    id: b.id,
    source: "booking",
    title,
    subtitle,
    date: b.pickupDate,
    start,
    end,
    allDay: false,
    tone: cancelled ? "gray" : tone,
    tentative: b.status === "pending" || b.status === "modified",
    cancelled,
    unassigned: !b.driverName && b.status !== "cancelled" && b.status !== "completed",
    icon: b.comment || b.flightNumber ? "clipboard" : "none",
    booking: b,
    searchText: normalizeText(
      [
        title,
        subtitle,
        b.travelerName,
        b.code,
        b.companyName,
        b.driverName,
        b.vehicleName,
        b.travelerPhone,
        b.travelerEmail,
        b.flightNumber,
        b.comment,
      ]
        .filter(Boolean)
        .join(" ")
    ),
  };
}

export function customToEvents(c: CustomEventDTO, windowFrom?: string, windowTo?: string): CalEvent[] {
  const base = {
    id: c.id,
    source: "custom" as const,
    title: c.title,
    subtitle: c.driverName ? `Sofőr: ${c.driverName}` : c.notes,
    tone: c.tone || (c.kind === "leave" ? "green" : "sky"),
    tentative: false,
    cancelled: false,
    unassigned: false,
    icon: (c.kind === "leave" ? "palm" : c.notes ? "clipboard" : "none") as CalEvent["icon"],
    custom: c,
    searchText: normalizeText([c.title, c.driverName, c.notes].filter(Boolean).join(" ")),
  };

  if (c.allDay) {
    const first = parseYmd(c.startDate);
    const last = parseYmd(c.endDate < c.startDate ? c.startDate : c.endDate);
    const total = diffDays(last, first) + 1;
    const from = windowFrom ? parseYmd(windowFrom) : first;
    const to = windowTo ? parseYmd(windowTo) : last;
    const rangeStart = first > from ? first : from;
    const rangeEnd = last < to ? last : to;
    const events: CalEvent[] = [];
    for (let d = startOfDay(rangeStart); d <= rangeEnd; d = addDays(d, 1)) {
      events.push({
        ...base,
        key: `c:${c.id}:${ymd(d)}`,
        date: ymd(d),
        start: d.getTime(),
        end: addDays(d, 1).getTime(),
        allDay: true,
        dayIndex: diffDays(d, first) + 1,
        dayCount: total,
      });
    }
    return events;
  }

  const start = parseLocal(c.startDate, c.startTime || "00:00");
  let end = parseLocal(c.endDate || c.startDate, c.endTime || c.startTime || "00:00");
  if (end <= start) end = start + 30 * 60_000;
  return [{ ...base, key: `c:${c.id}`, date: c.startDate, start, end, allDay: false }];
}

export function compareEvents(a: CalEvent, b: CalEvent): number {
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
  return a.start - b.start || a.end - b.end || a.title.localeCompare(b.title, "hu");
}

export function buildEvents(
  bookings: CalendarBooking[],
  custom: CustomEventDTO[],
  windowFrom?: string,
  windowTo?: string
): CalEvent[] {
  const events = [
    ...bookings.map(bookingToEvent),
    ...custom.flatMap((c) => customToEvents(c, windowFrom, windowTo)),
  ];
  return events.sort(compareEvents);
}

export function applyFilters(events: CalEvent[], filters: CalendarFilters): CalEvent[] {
  return events.filter((event) => {
    if (!filters.showCancelled && event.cancelled) return false;
    if (event.source === "custom") {
      if (filters.onlyUnassigned || filters.partners.length > 0) return false;
      if (filters.drivers.length > 0) {
        return !!event.custom?.driverName && filters.drivers.includes(event.custom.driverName);
      }
      return true;
    }
    const booking = event.booking!;
    if (filters.onlyUnassigned && !event.unassigned) return false;
    if (filters.partners.length > 0) {
      const partnerId = partnerOf(booking)?.id || "other";
      if (!filters.partners.includes(partnerId)) return false;
    }
    if (filters.drivers.length > 0) {
      if (!booking.driverName || !filters.drivers.includes(booking.driverName)) return false;
    }
    return true;
  });
}

export function groupByDate(events: CalEvent[]): Map<string, CalEvent[]> {
  const map = new Map<string, CalEvent[]>();
  for (const event of events) {
    const list = map.get(event.date);
    if (list) list.push(event);
    else map.set(event.date, [event]);
  }
  return map;
}

export interface PositionedEvent {
  event: CalEvent;
  column: number;
  columns: number;
}

/** Classic calendar column packing: overlapping events share the width of their cluster. */
export function layoutTimed(events: CalEvent[]): PositionedEvent[] {
  const sorted = [...events].sort((a, b) => a.start - b.start || b.end - a.end);
  const result: PositionedEvent[] = [];
  let cluster: PositionedEvent[] = [];
  let clusterEnd = -Infinity;
  let columnEnds: number[] = [];

  const flush = () => {
    for (const item of cluster) item.columns = columnEnds.length;
    result.push(...cluster);
    cluster = [];
    columnEnds = [];
    clusterEnd = -Infinity;
  };

  for (const event of sorted) {
    if (event.start >= clusterEnd && cluster.length > 0) flush();
    let column = columnEnds.findIndex((end) => end <= event.start);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(event.end);
    } else {
      columnEnds[column] = event.end;
    }
    clusterEnd = Math.max(clusterEnd, event.end);
    cluster.push({ event, column, columns: 1 });
  }
  flush();
  return result;
}
