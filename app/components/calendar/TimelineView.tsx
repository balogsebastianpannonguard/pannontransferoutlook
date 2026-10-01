"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { HU_WEEKDAY_HEADERS, isSameDay, mondayIndex, ymd, MS_MINUTE } from "@/lib/calendar/dates";
import { layoutTimed } from "@/lib/calendar/mapping";
import { ALL_DAY_TONE, TONES } from "@/lib/calendar/tones";
import type { CalEvent } from "@/lib/calendar/types";
import { eventSurface, EventStatusChip } from "./EventCards";

interface Props {
  days: Date[];
  eventsByDate: Map<string, CalEvent[]>;
  now: number;
  selected: Date;
  showHeader: boolean;
  hourPx?: number;
  scrollKey: string;
  onOpen: (event: CalEvent) => void;
  onSelectDay?: (date: Date) => void;
  onPage?: (dir: 1 | -1) => void;
}

const GUTTER = 46;

function hourLabel(hour: number) {
  return `${hour}:00`;
}

export default function TimelineView({
  days,
  eventsByDate,
  now,
  selected,
  showHeader,
  hourPx = 56,
  scrollKey,
  onOpen,
  onSelectDay,
  onPage,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number; t: number } | null>(null);
  const today = new Date(now);

  const allDayByDay = useMemo(
    () => days.map((day) => (eventsByDate.get(ymd(day)) ?? []).filter((e) => e.allDay)),
    [days, eventsByDate]
  );
  const hasAllDay = allDayByDay.some((list) => list.length > 0);
  const hasData = eventsByDate.size > 0;

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let hour = 7;
    const containsToday = days.some((d) => isSameDay(d, today));
    if (containsToday) {
      // Keep the running/upcoming trips of today in view, not just the clock line.
      hour = new Date(now).getHours() - 1;
      const relevant = (eventsByDate.get(ymd(today)) ?? []).filter((e) => !e.allDay && e.end > now - 60 * MS_MINUTE);
      if (relevant.length > 0) hour = Math.min(hour, new Date(relevant[0].start).getHours());
    } else {
      const starts = days.flatMap((d) =>
        (eventsByDate.get(ymd(d)) ?? []).filter((e) => !e.allDay).map((e) => new Date(e.start).getHours())
      );
      if (starts.length > 0) hour = Math.min(...starts) - 1;
    }
    el.scrollTop = Math.max(0, hour * hourPx - 16);
    // Re-anchor when the view changes or the first data arrives, not on every refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollKey, hourPx, hasData]);

  const nowMinutes = (() => {
    const d = new Date(now);
    return d.getHours() * 60 + d.getMinutes();
  })();

  const onPointerDown = (event: React.PointerEvent) => {
    swipe.current = { x: event.clientX, y: event.clientY, t: performance.now() };
  };
  const onPointerUp = (event: React.PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || !onPage) return;
    const dx = event.clientX - s.x;
    const dy = event.clientY - s.y;
    if (Math.abs(dx) > 64 && Math.abs(dx) > Math.abs(dy) * 1.7 && performance.now() - s.t < 700) {
      onPage(dx < 0 ? 1 : -1);
    }
  };

  return (
    <div className="flex h-full flex-col bg-white" style={{ touchAction: "pan-y" }} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
      {showHeader && (
        <div className="flex shrink-0 border-b border-oc-line bg-white pt-1">
          <div style={{ width: GUTTER }} className="shrink-0" />
          {days.map((day) => {
            const isToday = isSameDay(day, today);
            const isSelected = isSameDay(day, selected);
            return (
              <button
                key={ymd(day)}
                type="button"
                onClick={() => onSelectDay?.(day)}
                className="flex min-w-0 flex-1 flex-col items-center gap-0.5 pb-1.5"
              >
                <span className={`text-[12px] font-medium ${isToday ? "text-oc-blue" : "text-oc-muted"}`}>
                  {HU_WEEKDAY_HEADERS[mondayIndex(day)]}
                </span>
                <span
                  className={`flex h-[30px] w-[30px] items-center justify-center rounded-full text-[16px] ${
                    isToday
                      ? "bg-oc-blue font-medium text-white"
                      : isSelected
                        ? "bg-oc-tint font-medium text-oc-blue-dark"
                        : "text-oc-ink"
                  }`}
                >
                  {day.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {hasAllDay && (
        <div className="flex shrink-0 border-b border-oc-line bg-white py-1">
          <div style={{ width: GUTTER }} className="flex shrink-0 items-start justify-end pt-[3px] pr-1.5">
            <span className="text-[9.5px] leading-[12px] font-medium tracking-wide text-oc-muted uppercase">Egész</span>
          </div>
          {days.map((day, index) => (
            <div key={ymd(day)} className="flex min-w-0 flex-1 flex-col gap-[3px] px-[2px]">
              {allDayByDay[index].map((event) => {
                const useGreen = event.tone === "green" || event.tone === "sky";
                const tone = TONES[event.tone];
                return (
                  <button
                    key={event.key}
                    type="button"
                    onClick={() => onOpen(event)}
                    className="truncate rounded-[7px] border-[1.5px] px-1.5 py-[3px] text-left text-[12px] leading-[15px] font-medium"
                    style={
                      useGreen
                        ? { borderColor: ALL_DAY_TONE.border, color: ALL_DAY_TONE.text, background: ALL_DAY_TONE.bg }
                        : { borderColor: tone.border, color: tone.text, background: tone.bg }
                    }
                  >
                    {event.title}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="oc-scroll relative flex-1 overflow-y-auto overscroll-contain">
        <div className="relative flex" style={{ height: 24 * hourPx + 8 }}>
          <div style={{ width: GUTTER }} className="relative shrink-0">
            {Array.from({ length: 23 }, (_, i) => i + 1).map((hour) => (
              <span
                key={hour}
                className="absolute right-1.5 text-[11px] leading-[14px] text-oc-muted tabular-nums"
                style={{ top: hour * hourPx - 7 }}
              >
                {hourLabel(hour)}
              </span>
            ))}
          </div>

          <div className="pointer-events-none absolute inset-y-0 right-0" style={{ left: GUTTER }}>
            {Array.from({ length: 24 }, (_, hour) => (
              <div key={hour} className="absolute right-0 left-0 bg-[#E8E8E8]" style={{ top: hour * hourPx, height: 1 }} />
            ))}
          </div>

          {days.map((day) => {
            const list = (eventsByDate.get(ymd(day)) ?? []).filter((e) => !e.allDay);
            const positioned = layoutTimed(list);
            const isToday = isSameDay(day, today);
            const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
            return (
              <div key={ymd(day)} className="oc-fade-in relative min-w-0 flex-1 border-l border-[#EFEFEF]">
                {positioned.map(({ event, column, columns }) => {
                  const startMin = Math.max(0, (event.start - dayStart) / MS_MINUTE);
                  const endMin = Math.min(1440, (event.end - dayStart) / MS_MINUTE);
                  const top = (startMin / 60) * hourPx + 1;
                  const height = Math.max(22, ((endMin - startMin) / 60) * hourPx - 2);
                  const tall = height >= 44;
                  const strike = event.cancelled ? "line-through" : "";
                  return (
                    <button
                      key={event.key}
                      type="button"
                      onClick={() => onOpen(event)}
                      className="oc-card absolute overflow-hidden rounded-[8px] px-[8px] py-[4px] text-left"
                      style={{
                        ...eventSurface(event),
                        top,
                        height,
                        left: `calc(${(column / columns) * 100}% + 2px)`,
                        width: `calc(${100 / columns}% - 4px)`,
                      }}
                    >
                      <div className={`truncate text-[12.5px] leading-[16px] font-medium ${strike}`}>{event.title}</div>
                      {tall && event.subtitle && (
                        <div className={`truncate text-[11px] leading-[14px] opacity-80 ${strike}`}>{event.subtitle}</div>
                      )}
                      {height >= 70 && (
                        <div className="mt-0.5">
                          <EventStatusChip event={event} />
                        </div>
                      )}
                    </button>
                  );
                })}

                {isToday && (
                  <div
                    className="pointer-events-none absolute right-0 left-0 z-10 flex items-center"
                    style={{ top: (nowMinutes / 60) * hourPx - 5 }}
                  >
                    <span className="h-[10px] w-[10px] shrink-0 rounded-full bg-[#D13438]" style={{ marginLeft: -5 }} />
                    <span className="h-[2px] flex-1 bg-[#D13438]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
