"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { addDays, diffDays, parseYmd, ymd } from "@/lib/calendar/dates";
import { buildEvents } from "@/lib/calendar/mapping";
import type { CalEvent, CalendarBooking, CalendarPayload, CustomEventDTO } from "@/lib/calendar/types";

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", notify);
      return () => mql.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

const noopSubscribe = () => () => {};

export function useIsClient(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

const NOW_BUCKET_MS = 15_000;

function subscribeClock(notify: () => void) {
  const timer = setInterval(notify, 5_000);
  document.addEventListener("visibilitychange", notify);
  return () => {
    clearInterval(timer);
    document.removeEventListener("visibilitychange", notify);
  };
}

/** Current time in 15s steps (null while rendering on the server) so pills like "Most" stay fresh. */
export function useNow(): number | null {
  return useSyncExternalStore(
    subscribeClock,
    () => Math.floor(Date.now() / NOW_BUCKET_MS) * NOW_BUCKET_MS,
    () => null
  );
}

const storageListeners = new Set<() => void>();
const memoryStore = new Map<string, string>();

function subscribeStorage(notify: () => void) {
  storageListeners.add(notify);
  window.addEventListener("storage", notify);
  return () => {
    storageListeners.delete(notify);
    window.removeEventListener("storage", notify);
  };
}

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key) ?? memoryStore.get(key) ?? null;
  } catch {
    return memoryStore.get(key) ?? null;
  }
}

export function useStoredState<T>(key: string, initial: T): [T, (value: T) => void] {
  const raw = useSyncExternalStore(subscribeStorage, () => readStored(key), () => null);
  const value = useMemo(() => {
    if (!raw) return initial;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  }, [raw, initial]);
  const update = useCallback(
    (next: T) => {
      const serialized = JSON.stringify(next);
      memoryStore.set(key, serialized);
      try {
        window.localStorage.setItem(key, serialized);
      } catch {}
      storageListeners.forEach((listener) => listener());
    },
    [key]
  );
  return [value, update];
}

interface Range {
  from: string;
  to: string;
}

const POLL_MS = 30_000;
const PAST_DAYS = 45;
const FUTURE_DAYS = 150;
const EXTEND_DAYS = 90;
const MAX_WINDOW_DAYS = 470;
const HARD_LIMIT_DAYS = 730;

export interface CalendarData {
  events: CalEvent[];
  rawBookings: CalendarBooking[];
  rawCustom: CustomEventDTO[];
  range: Range | null;
  loading: boolean;
  error: string | null;
  pendingCount: number;
  ensureRange: (from: string, to: string) => void;
  refresh: () => Promise<void>;
  newBookings: CalendarBooking[];
  dismissNewBookings: () => void;
}

export function useCalendarData(anchor: Date | null): CalendarData {
  const router = useRouter();
  const [bookings, setBookings] = useState<CalendarBooking[]>([]);
  const [custom, setCustom] = useState<CustomEventDTO[]>([]);
  const [range, setRange] = useState<Range | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [newBookings, setNewBookings] = useState<CalendarBooking[]>([]);

  const rangeRef = useRef<Range | null>(null);
  const seqRef = useRef(0);
  const knownIds = useRef<Set<string> | null>(null);
  const inflight = useRef(false);
  const originRef = useRef<Date | null>(null);

  const load = useCallback(async (target: Range, opts: { silent?: boolean } = {}) => {
    const seq = ++seqRef.current;
    if (!opts.silent) setLoading(true);
    inflight.current = true;
    try {
      const res = await fetch(`/api/calendar?from=${target.from}&to=${target.to}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      if (!res.ok) throw new Error("Nem sikerült betölteni a naptárat.");
      const data = (await res.json()) as CalendarPayload;
      if (seq !== seqRef.current) return;

      const ids = new Set(data.bookings.map((b) => b.id));
      if (knownIds.current) {
        const fresh = data.bookings.filter(
          (b) => !knownIds.current!.has(b.id) && b.status === "pending" && Date.now() - b.createdAt < 10 * 60_000
        );
        if (fresh.length > 0) setNewBookings((current) => [...fresh, ...current].slice(0, 5));
      }
      knownIds.current = ids;

      rangeRef.current = target;
      setRange(target);
      setBookings(data.bookings);
      setCustom(data.events);
      setPendingCount(data.pendingCount);
      setError(null);
    } catch (err) {
      if (seq !== seqRef.current) return;
      setError(err instanceof Error ? err.message : "Hálózati hiba");
    } finally {
      inflight.current = false;
      if (seq === seqRef.current) setLoading(false);
    }
  }, [router]);

  const anchorKey = anchor ? ymd(anchor) : null;
  useEffect(() => {
    if (!anchorKey || rangeRef.current) return;
    const base = parseYmd(anchorKey);
    originRef.current = base;
    void load({ from: ymd(addDays(base, -PAST_DAYS)), to: ymd(addDays(base, FUTURE_DAYS)) });
  }, [anchorKey, load]);

  const ensureRange = useCallback(
    (from: string, to: string) => {
      const current = rangeRef.current;
      const base = originRef.current;
      if (!current || !base || inflight.current) return;
      const needFrom = from < current.from && from >= ymd(addDays(base, -HARD_LIMIT_DAYS));
      const needTo = to > current.to && to <= ymd(addDays(base, HARD_LIMIT_DAYS));
      if (!needFrom && !needTo) return;
      let nextFrom = needFrom ? ymd(addDays(parseYmd(from), -EXTEND_DAYS)) : current.from;
      let nextTo = needTo ? ymd(addDays(parseYmd(to), EXTEND_DAYS)) : current.to;
      // The API accepts at most ~500 days per request; drop the far side of the window.
      if (diffDays(parseYmd(nextTo), parseYmd(nextFrom)) > MAX_WINDOW_DAYS) {
        if (needFrom) nextTo = ymd(addDays(parseYmd(nextFrom), MAX_WINDOW_DAYS));
        else nextFrom = ymd(addDays(parseYmd(nextTo), -MAX_WINDOW_DAYS));
      }
      void load({ from: nextFrom, to: nextTo }, { silent: true });
    },
    [load]
  );

  const refresh = useCallback(async () => {
    if (rangeRef.current) await load(rangeRef.current, { silent: true });
  }, [load]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible" && rangeRef.current && !inflight.current) {
        void load(rangeRef.current, { silent: true });
      }
    };
    const timer = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [load]);

  const events = useMemo(
    () => buildEvents(bookings, custom, range?.from, range?.to),
    [bookings, custom, range]
  );

  return {
    events,
    rawBookings: bookings,
    rawCustom: custom,
    range,
    loading,
    error,
    pendingCount,
    ensureRange,
    refresh,
    newBookings,
    dismissNewBookings: () => setNewBookings([]),
  };
}

export function datesWithEvents(events: CalEvent[]): Set<string> {
  const set = new Set<string>();
  for (const event of events) set.add(event.date);
  return set;
}
