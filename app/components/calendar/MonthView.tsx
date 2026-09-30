"use client";

import { formatClock, isSameDay, weekRows, ymd } from "@/lib/calendar/dates";
import { ALL_DAY_TONE, TONES } from "@/lib/calendar/tones";
import type { CalEvent } from "@/lib/calendar/types";
import { eventSurface } from "./EventCards";

const WEEKDAY_NAMES = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"];
const MAX_CHIPS = 3;

interface Props {
  anchor: Date;
  today: Date;
  eventsByDate: Map<string, CalEvent[]>;
  onOpen: (event: CalEvent) => void;
  onSelectDay: (date: Date) => void;
  onOpenDay: (date: Date) => void;
}

export default function MonthView({ anchor, today, eventsByDate, onOpen, onSelectDay, onOpenDay }: Props) {
  const rows = weekRows(anchor);
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="grid shrink-0 grid-cols-7 border-b border-oc-line">
        {WEEKDAY_NAMES.map((name) => (
          <div key={name} className="px-2 py-2 text-[12px] font-medium text-oc-muted">
            {name}
          </div>
        ))}
      </div>
      <div className="grid min-h-0 flex-1" style={{ gridTemplateRows: `repeat(${rows.length}, minmax(0, 1fr))` }}>
        {rows.map((row) => (
          <div key={ymd(row[0])} className="grid min-h-0 grid-cols-7">
            {row.map((date) => {
              const events = eventsByDate.get(ymd(date)) ?? [];
              const shown = events.slice(0, MAX_CHIPS);
              const extra = events.length - shown.length;
              const isToday = isSameDay(date, today);
              const otherMonth = date.getMonth() !== anchor.getMonth();
              return (
                <div
                  key={ymd(date)}
                  onClick={() => onSelectDay(date)}
                  onDoubleClick={() => onOpenDay(date)}
                  className={`min-h-0 cursor-pointer overflow-hidden border-r border-b border-[#EFEFEF] p-1 transition-colors hover:bg-[#FAFAFA] ${
                    otherMonth ? "bg-[#FBFBFB]" : ""
                  } ${isSameDay(date, anchor) ? "bg-oc-tint/60" : ""}`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={`flex h-[24px] min-w-[24px] items-center justify-center rounded-full px-1 text-[12.5px] ${
                        isToday
                          ? "bg-oc-blue font-medium text-white"
                          : otherMonth
                            ? "text-[#A8A8A8]"
                            : "font-medium text-oc-ink"
                      }`}
                    >
                      {date.getDate() === 1 ? `${date.getDate()}.` : date.getDate()}
                    </span>
                  </div>
                  <div className="flex flex-col gap-[2px]">
                    {shown.map((event) => {
                      const tone = TONES[event.tone];
                      const useGreen = event.tone === "green" || event.tone === "sky";
                      return (
                        <button
                          key={event.key}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpen(event);
                          }}
                          className={`flex h-[20px] items-center gap-1 truncate rounded-[4px] px-1.5 text-left text-[11.5px] leading-none font-medium ${
                            event.cancelled ? "line-through" : ""
                          }`}
                          style={
                            event.allDay
                              ? useGreen
                                ? { border: `1.5px solid ${ALL_DAY_TONE.border}`, color: ALL_DAY_TONE.text, background: "#fff" }
                                : { border: `1.5px solid ${tone.border}`, color: tone.text, background: tone.bg }
                              : eventSurface(event)
                          }
                        >
                          {!event.allDay && <span className="shrink-0 tabular-nums opacity-80">{formatClock(event.start)}</span>}
                          <span className="truncate">{event.title}</span>
                        </button>
                      );
                    })}
                    {extra > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDay(date);
                        }}
                        className="px-1.5 text-left text-[11.5px] font-medium text-oc-blue hover:underline"
                      >
                        +{extra} további
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
