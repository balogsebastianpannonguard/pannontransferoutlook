"use client";

import { useEffect, useRef, useState } from "react";
import { useIsClient } from "./hooks";
import { createPortal } from "react-dom";
import { ArrowLeft, Search, X } from "lucide-react";
import { bookingToEvent, customToEvents } from "@/lib/calendar/mapping";
import { formatClock, HU_MONTHS, parseYmd } from "@/lib/calendar/dates";
import type { CalEvent, CalendarPayload } from "@/lib/calendar/types";
import { eventSurface } from "./EventCards";

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (event: CalEvent) => void;
}

export default function SearchPanel({ open, onClose, onPick }: Props) {
  const mounted = useIsClient();
  if (!open || !mounted) return null;
  return createPortal(<SearchBody onClose={onClose} onPick={onPick} />, document.body);
}

interface Settled {
  query: string;
  events: CalEvent[];
  error: string | null;
}

function SearchBody({ onClose, onPick }: Omit<Props, "open">) {
  const [query, setQuery] = useState("");
  const [settled, setSettled] = useState<Settled | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const q = query.trim();
  useEffect(() => {
    if (q.length < 2) return;
    let alive = true;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/calendar/search?q=${encodeURIComponent(q)}`, { credentials: "include", cache: "no-store" });
        if (!res.ok) throw new Error("A keresés nem sikerült.");
        const data = (await res.json()) as CalendarPayload;
        const events = [
          ...data.bookings.map(bookingToEvent),
          ...data.events.map((c) => customToEvents(c)[0]).filter(Boolean),
        ].sort((a, b) => b.start - a.start);
        if (alive) setSettled({ query: q, events, error: null });
      } catch (err) {
        if (alive) setSettled({ query: q, events: [], error: err instanceof Error ? err.message : "Hiba" });
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [q]);

  const ready = q.length >= 2 && settled?.query === q;
  const loading = q.length >= 2 && !ready;
  const results = ready ? settled.events : [];
  const error = ready ? settled.error : null;

  return (
    <div className="oc-root oc-fade-in fixed inset-0 z-[70] flex justify-center bg-white lg:bg-black/40 lg:pt-14">
      <div className="oc-shadow-sheet flex h-full w-full flex-col overflow-hidden bg-white lg:h-[min(680px,84vh)] lg:max-w-[680px] lg:rounded-[12px]">
        <div className="oc-safe-top flex shrink-0 items-center gap-1 bg-oc-blue px-2 pt-2 pb-2 text-white lg:bg-white lg:text-oc-ink">
          <button type="button" onClick={onClose} aria-label="Vissza" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/15 lg:hover:bg-oc-surface">
            <ArrowLeft size={22} />
          </button>
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Keresés: utas, kód, sofőr, cím…"
            className="h-10 min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-white/70 lg:placeholder:text-[#8A8A8A]"
            enterKeyHint="search"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Törlés" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/15 lg:hover:bg-oc-surface">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="oc-scroll min-h-0 flex-1 overflow-y-auto">
          {q.length < 2 && (
            <div className="flex flex-col items-center gap-2 px-6 pt-16 text-center text-oc-muted">
              <Search size={36} strokeWidth={1.4} />
              <p className="text-[15px]">Keress utasra, foglalási kódra, sofőrre, járműre vagy címre.</p>
            </div>
          )}
          {loading && <div className="px-4 py-3 text-[13px] text-oc-muted">Keresés…</div>}
          {error && <div className="px-4 py-3 text-[13px] text-[#B3261E]">{error}</div>}
          {ready && !error && results.length === 0 && (
            <div className="px-6 pt-12 text-center text-[15px] text-oc-muted">Nincs találat.</div>
          )}
          <ul>
            {results.map((event) => {
              const date = parseYmd(event.date);
              return (
                <li key={event.key}>
                  <button
                    type="button"
                    onClick={() => onPick(event)}
                    className="oc-ripple flex w-full items-stretch gap-3 border-b border-[#F0F0F0] px-4 py-3 text-left"
                  >
                    <div className="w-[52px] shrink-0 text-center">
                      <div className="text-[11px] leading-[14px] font-medium text-oc-muted uppercase">{HU_MONTHS[date.getMonth()].slice(0, 3)}</div>
                      <div className="text-[22px] leading-[26px] font-medium text-oc-ink">{date.getDate()}</div>
                      <div className="text-[11px] leading-[14px] text-oc-muted">{event.allDay ? "egész nap" : formatClock(event.start)}</div>
                    </div>
                    <div className="min-w-0 flex-1 rounded-[6px] px-3 py-1.5" style={eventSurface(event)}>
                      <div className={`truncate text-[14px] leading-[18px] font-medium ${event.cancelled ? "line-through" : ""}`}>{event.title}</div>
                      {event.subtitle && <div className="truncate text-[12px] leading-[16px] opacity-80">{event.subtitle}</div>}
                      {event.booking && (
                        <div className="truncate text-[12px] leading-[16px] opacity-80">
                          {event.booking.travelerName} · {event.booking.code}
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
