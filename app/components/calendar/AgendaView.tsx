"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { CalendarCheck, Plus } from "lucide-react";
import { addDays, HU_MONTHS, HU_WEEKDAYS, monthKey, parseYmd, relativeDayLabel, ymd } from "@/lib/calendar/dates";
import type { CalEvent } from "@/lib/calendar/types";
import { EventCard, formatCountdown, NowPill, TimeColumn } from "./EventCards";

interface Props {
  eventsByDate: Map<string, CalEvent[]>;
  pinnedDate: string;
  now: number;
  scrollTarget: { date: string; nonce: number };
  onVisibleDate: (date: string) => void;
  onOpen: (event: CalEvent) => void;
  onNeedMore: (direction: "past" | "future") => void;
  onAddOnDay?: (date: string) => void;
  range: { from: string; to: string } | null;
  singleDay?: boolean;
  loading?: boolean;
}

function EmptyDay({ day, loading, onAdd }: { day: string; loading?: boolean; onAdd?: (date: string) => void }) {
  if (loading) {
    return (
      <div className="pr-3 pb-2 pl-[82px]">
        <div className="h-[46px] animate-pulse rounded-[10px] bg-oc-surface" />
      </div>
    );
  }
  return (
    <div className="pr-3 pb-2 pl-[82px]">
      <button
        type="button"
        onClick={() => onAdd?.(day)}
        disabled={!onAdd}
        aria-label="Erre a napra nincs tevékenység. Új esemény felvétele"
        className="flex min-h-[46px] w-full items-center gap-[10px] rounded-[10px] border border-dashed border-[#D6D6D6] bg-[#FAFAFA] py-2 pr-[10px] pl-[10px] text-left transition-colors active:bg-oc-surface"
      >
        <span className="grid size-[26px] shrink-0 place-items-center rounded-full bg-white text-[#8A8886] shadow-[0_0_0_1px_#E6E6E6]">
          <CalendarCheck size={14} strokeWidth={1.9} />
        </span>
        <span className="min-w-0 flex-1 text-[14px] leading-[18px] text-[#6F6F6F]">Erre a napra nincs tevékenység</span>
        {onAdd && <Plus size={17} strokeWidth={2} className="shrink-0 text-oc-blue" aria-hidden />}
      </button>
    </div>
  );
}

export default function AgendaView({
  eventsByDate,
  pinnedDate,
  now,
  scrollTarget,
  onVisibleDate,
  onOpen,
  onNeedMore,
  onAddOnDay,
  range,
  singleDay,
  loading,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef(new Map<string, HTMLElement>());
  const ignoreScrollUntil = useRef(0);
  const lastEmitted = useRef<string>("");
  const anchorRef = useRef<{ day: string; delta: number } | null>(null);
  const pendingTarget = useRef<string | null>(null);
  const settled = useRef(false);
  const prevLayout = useRef<{ first?: string; firstTop: number }>({ firstTop: 0 });
  const rafRef = useRef(0);

  // Every day of the loaded range is listed, so days without activity stay visible like in Outlook.
  const days = useMemo(() => {
    if (singleDay || !range) return [pinnedDate];
    const list: string[] = [];
    const end = parseYmd(range.to);
    for (let d = parseYmd(range.from); d <= end; d = addDays(d, 1)) list.push(ymd(d));
    return list;
  }, [range, pinnedDate, singleDay]);

  const jumpTo = (date: string, instant = false) => {
    const el = containerRef.current;
    if (!el || days.length === 0) return;
    const inRange = date >= days[0] && date <= days[days.length - 1];
    const target = inRange ? date : date < days[0] ? days[0] : days[days.length - 1];
    const section = sectionRefs.current.get(target);
    if (!section) return;
    pendingTarget.current = inRange ? null : date;
    ignoreScrollUntil.current = Date.now() + 700;
    lastEmitted.current = target;
    const top = section.offsetTop - 4;
    el.scrollTo({ top, behavior: !instant && Math.abs(el.scrollTop - top) < 1400 && el.scrollTop > 0 ? "smooth" : "auto" });
  };

  // Keep the visible day in place when days are added or dropped above it.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const first = days[0];
    const prev = prevLayout.current;
    if (!singleDay && prev.first && first && first !== prev.first) {
      const anchor = anchorRef.current;
      const anchorSection = anchor ? sectionRefs.current.get(anchor.day) : null;
      const prevFirstSection = sectionRefs.current.get(prev.first);
      if (anchor && anchorSection) el.scrollTop = anchorSection.offsetTop - anchor.delta;
      else if (prevFirstSection) el.scrollTop += prevFirstSection.offsetTop - prev.firstTop;
    }
    prevLayout.current = { first, firstTop: (first && sectionRefs.current.get(first)?.offsetTop) || 0 };
  });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (singleDay) {
      el.scrollTop = 0;
      return;
    }
    jumpTo(scrollTarget.date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollTarget.nonce]);

  // Lands on the pinned day once the full range is rendered, and finishes jumps that went beyond the loaded range.
  useLayoutEffect(() => {
    if (singleDay) {
      settled.current = false;
      return;
    }
    if (!range) return;
    if (!settled.current) {
      settled.current = true;
      jumpTo(pinnedDate, true);
      return;
    }
    const pending = pendingTarget.current;
    if (pending && days.length > 0 && pending >= days[0] && pending <= days[days.length - 1]) jumpTo(pending, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const handleScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const el = containerRef.current;
      if (!el || singleDay) return;

      if (el.scrollTop < 900) onNeedMore("past");
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 1400) onNeedMore("future");

      const probe = el.scrollTop + 12;
      let current: string | null = null;
      for (const day of days) {
        const section = sectionRefs.current.get(day);
        if (!section) continue;
        if (section.offsetTop + section.offsetHeight > probe) {
          current = day;
          anchorRef.current = { day, delta: section.offsetTop - el.scrollTop };
          break;
        }
      }

      if (Date.now() < ignoreScrollUntil.current || pendingTarget.current) return;
      if (current && current !== lastEmitted.current) {
        lastEmitted.current = current;
        onVisibleDate(current);
      }
    });
  }, [days, onNeedMore, onVisibleDate, singleDay]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const today = new Date(now);
  const todayKey = ymd(today);

  return (
    <div ref={containerRef} onScroll={handleScroll} className="oc-scroll relative h-full overflow-y-auto overscroll-contain bg-white">
      <div className={singleDay ? "pt-4" : "pt-[6px]"}>
        {days.map((day, index) => {
          const date = parseYmd(day);
          const events = eventsByDate.get(day) ?? [];
          const showMonth = !singleDay && (index === 0 || monthKey(parseYmd(days[index - 1])) !== monthKey(date));
          const relative = relativeDayLabel(date, today);
          const isToday = day === todayKey;
          const allDay = events.filter((e) => e.allDay);
          const timed = events.filter((e) => !e.allDay);

          let ongoingKey: string | null = null;
          let nextKey: string | null = null;
          if (isToday) {
            ongoingKey = timed.find((e) => !e.cancelled && e.start <= now && e.end > now)?.key ?? null;
            nextKey = timed.find((e) => !e.cancelled && e.start > now)?.key ?? null;
          }

          return (
            <section
              key={day}
              ref={(node) => {
                if (node) sectionRefs.current.set(day, node);
                else sectionRefs.current.delete(day);
              }}
              className="pb-2"
            >
              {showMonth && (
                <div className="mt-3 mb-[14px] flex items-center gap-[10px] px-3">
                  <span className="h-px flex-1 bg-oc-ink/80" style={{ height: "0.5px" }} />
                  <span className="text-[20px] leading-[26px] font-medium text-oc-ink">
                    {HU_MONTHS[date.getMonth()]}
                    {date.getFullYear() !== today.getFullYear() ? ` ${date.getFullYear()}` : ""}
                  </span>
                  <span className="h-px flex-1 bg-oc-ink/80" style={{ height: "0.5px" }} />
                </div>
              )}

              {(
                <h3 className="mb-[10px] flex items-baseline gap-[10px] px-3 text-[19px] leading-[26px] text-oc-ink">
                  <span className="font-bold">
                    {date.getDate()}, {HU_WEEKDAYS[date.getDay()]}
                  </span>
                  {relative && <span className="font-normal">{relative}</span>}
                </h3>
              )}

              {events.length === 0 && <EmptyDay day={day} loading={loading} onAdd={onAddOnDay} />}

              {allDay.map((event) => (
                <div key={event.key} className="mb-2 flex items-start px-3">
                  <TimeColumn event={event} />
                  <div className="min-w-0 flex-1">
                    <EventCard event={event} onOpen={onOpen} />
                  </div>
                </div>
              ))}

              {timed.map((event) => (
                <div key={event.key}>
                  {event.key === ongoingKey && <NowPill>Most</NowPill>}
                  {event.key === nextKey && (
                    <NowPill clock>Kezdés {formatCountdown(event.start - now)} múlva</NowPill>
                  )}
                  <div className="mb-2 flex items-start px-3">
                    <TimeColumn event={event} />
                    <div className="min-w-0 flex-1">
                      <EventCard event={event} onOpen={onOpen} />
                    </div>
                  </div>
                </div>
              ))}
            </section>
          );
        })}
        <div className="h-40" />
      </div>
    </div>
  );
}
