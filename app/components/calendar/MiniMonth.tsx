"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, HU_WEEKDAY_HEADERS, HU_MONTHS, isSameDay, startOfMonth, weekRows, ymd } from "@/lib/calendar/dates";

interface Props {
  selected: Date;
  today: Date;
  eventDates: Set<string>;
  onSelect: (date: Date) => void;
}

/** Compact month picker for the desktop sidebar. */
export default function MiniMonth({ selected, today, eventDates, onSelect }: Props) {
  const [shown, setShown] = useState(() => startOfMonth(selected));
  const [lastSelected, setLastSelected] = useState(selected);
  if (lastSelected.getTime() !== selected.getTime()) {
    setLastSelected(selected);
    if (shown.getMonth() !== selected.getMonth() || shown.getFullYear() !== selected.getFullYear()) {
      setShown(startOfMonth(selected));
    }
  }
  const rows = weekRows(shown);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="pl-1 text-[14px] font-semibold text-oc-ink">
          {shown.getFullYear()}. {HU_MONTHS[shown.getMonth()]}
        </span>
        <div className="flex">
          <button type="button" aria-label="Előző hónap" onClick={() => setShown(addMonths(shown, -1))} className="oc-ripple flex h-7 w-7 items-center justify-center rounded-full text-oc-muted">
            <ChevronLeft size={18} />
          </button>
          <button type="button" aria-label="Következő hónap" onClick={() => setShown(addMonths(shown, 1))} className="oc-ripple flex h-7 w-7 items-center justify-center rounded-full text-oc-muted">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-medium text-oc-muted">
        {HU_WEEKDAY_HEADERS.map((label) => (
          <span key={label} className="py-1">
            {label}
          </span>
        ))}
      </div>
      {rows.map((row) => (
        <div key={ymd(row[0])} className="grid grid-cols-7">
          {row.map((date) => {
            const isSel = isSameDay(date, selected);
            const isToday = isSameDay(date, today);
            const other = date.getMonth() !== shown.getMonth();
            return (
              <button
                key={ymd(date)}
                type="button"
                onClick={() => onSelect(date)}
                aria-pressed={isSel}
                className="relative flex h-8 items-center justify-center"
              >
                <span
                  className={`flex h-[28px] w-[28px] items-center justify-center rounded-full text-[12.5px] transition-colors ${
                    isSel
                      ? "bg-oc-blue font-medium text-white"
                      : isToday
                        ? "bg-oc-tint font-medium text-oc-blue-dark"
                        : other
                          ? "text-[#ADADAD] hover:bg-oc-surface"
                          : "text-oc-ink hover:bg-oc-surface"
                  }`}
                >
                  {date.getDate()}
                </span>
                {eventDates.has(ymd(date)) && !isSel && (
                  <span className="absolute bottom-[1px] h-[3px] w-[3px] rounded-full bg-oc-blue/60" />
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
