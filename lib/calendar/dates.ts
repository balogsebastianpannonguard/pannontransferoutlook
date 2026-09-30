export const HU_MONTHS = [
  "január", "február", "március", "április", "május", "június",
  "július", "augusztus", "szeptember", "október", "november", "december",
];

export const HU_WEEKDAYS = ["vasárnap", "hétfő", "kedd", "szerda", "csütörtök", "péntek", "szombat"];

/** Monday-first weekday labels exactly like Outlook's Hungarian mobile UI. */
export const HU_WEEKDAY_HEADERS = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];
export const HU_WEEKDAYS_SHORT = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];

export const MS_MINUTE = 60_000;
export const MS_HOUR = 60 * MS_MINUTE;

const pad = (n: number) => String(n).padStart(2, "0");

export function ymd(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseYmd(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function addMonths(date: Date, months: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), lastDay));
}

/** Monday index: 0 = Monday ... 6 = Sunday. */
export function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function startOfWeek(date: Date): Date {
  return addDays(startOfDay(date), -mondayIndex(date));
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function diffDays(a: Date, b: Date): number {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcA - utcB) / 86_400_000);
}

export function weekRows(anchor: Date): Date[][] {
  const first = startOfWeek(startOfMonth(anchor));
  const last = endOfMonth(anchor);
  const rows: Date[][] = [];
  let cursor = first;
  while (cursor <= last) {
    rows.push(Array.from({ length: 7 }, (_, i) => addDays(cursor, i)));
    cursor = addDays(cursor, 7);
  }
  return rows;
}

export function weekRow(anchor: Date): Date[] {
  const first = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}

/** Outlook style clock: no leading zero on the hour ("3:30", "14:10"). */
export function formatClock(ms: number): string {
  const d = new Date(ms);
  return `${d.getHours()}:${pad(d.getMinutes())}`;
}

export function formatClockPadded(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "30 p", "1 ó", "4 ó 17 p" */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} p`;
  if (m === 0) return `${h} ó`;
  return `${h} ó ${m} p`;
}

export function monthTitle(date: Date): string {
  return HU_MONTHS[date.getMonth()];
}

export function monthYearTitle(date: Date): string {
  return `${HU_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function longDate(date: Date): string {
  return `${date.getFullYear()}. ${HU_MONTHS[date.getMonth()]} ${date.getDate()}., ${HU_WEEKDAYS[date.getDay()]}`;
}

export function relativeDayLabel(date: Date, now: Date): string | null {
  const delta = diffDays(date, now);
  if (delta === 0) return "Ma";
  if (delta === 1) return "Holnap";
  if (delta === -1) return "Tegnap";
  return null;
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function isValidYmd(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseYmd(value).getTime());
}
