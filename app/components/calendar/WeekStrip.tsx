"use client";

import { useEffect, useRef, useState } from "react";
import { addDays, addMonths, HU_WEEKDAY_HEADERS, isSameDay, weekRows, ymd } from "@/lib/calendar/dates";

const ROW_H = 44;

export function WeekdayRow() {
  return (
    <div className="grid h-[38px] grid-cols-7 items-center text-center text-[14px] font-medium text-white">
      {HU_WEEKDAY_HEADERS.map((label) => (
        <span key={label}>{label}</span>
      ))}
    </div>
  );
}

interface DayCellProps {
  date: Date;
  selected: boolean;
  today: boolean;
  dim: boolean;
  hasEvents: boolean;
  onSelect: (date: Date) => void;
}

function DayCell({ date, selected, today, dim, hasEvents, onSelect }: DayCellProps) {
  const circle = selected
    ? "bg-oc-blue text-white"
    : today
      ? "bg-oc-tint text-oc-blue-dark"
      : dim
        ? "text-[#ADADAD]"
        : "text-oc-muted";
  return (
    <button
      type="button"
      onClick={() => onSelect(date)}
      aria-label={date.toLocaleDateString("hu-HU", { month: "long", day: "numeric", weekday: "long" })}
      aria-pressed={selected}
      className="relative block h-[44px] w-full outline-none"
    >
      <span
        className={`absolute top-[7px] left-1/2 flex h-[30px] w-[30px] -translate-x-1/2 items-center justify-center rounded-full text-[16px] leading-none transition-colors duration-150 ${circle} ${
          selected || today ? "font-medium" : "font-normal"
        }`}
      >
        {date.getDate()}
      </span>
      {hasEvents && !selected && !today && (
        <span className="absolute top-[31.5px] left-1/2 h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-oc-dot" />
      )}
      {hasEvents && today && !selected && (
        <span className="absolute top-[35px] left-1/2 h-[4px] w-[4px] -translate-x-1/2 rounded-full bg-oc-blue" />
      )}
    </button>
  );
}

interface Props {
  selected: Date;
  today: Date;
  eventDates: Set<string>;
  onSelect: (date: Date) => void;
  forceExpanded?: boolean;
}

interface PanelProps {
  anchor: Date;
  expanded: boolean;
  selected: Date;
  today: Date;
  eventDates: Set<string>;
  onSelect: (date: Date) => void;
}

function Panel({ anchor, expanded, selected, today, eventDates, onSelect }: PanelProps) {
  const rows = weekRows(anchor);
  const rowIndex = Math.max(
    0,
    rows.findIndex((row) => row.some((d) => isSameDay(d, anchor)))
  );
  return (
    <div className="w-1/3 shrink-0 overflow-hidden" style={{ height: expanded ? rows.length * ROW_H : ROW_H }}>
      <div
        style={{
          transform: `translateY(${expanded ? 0 : -rowIndex * ROW_H}px)`,
          transition: "transform 260ms cubic-bezier(0.2, 0, 0, 1)",
        }}
      >
        {rows.map((row) => (
          <div key={ymd(row[0])} className="grid grid-cols-7">
            {row.map((date) => (
              <DayCell
                key={ymd(date)}
                date={date}
                selected={isSameDay(date, selected)}
                today={isSameDay(date, today)}
                dim={expanded && date.getMonth() !== anchor.getMonth()}
                hasEvents={eventDates.has(ymd(date))}
                onSelect={onSelect}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WeekStrip({ selected, today, eventDates, onSelect, forceExpanded }: Props) {
  const [expandedState, setExpanded] = useState(false);
  const expanded = !!forceExpanded || expandedState;
  const [dx, setDx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ x: number; y: number; t: number; axis: "x" | "y" | null } | null>(null);
  const didDrag = useRef(false);
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const step = (dir: 1 | -1) => (expanded ? addMonths(selected, dir) : addDays(selected, 7 * dir));
  const centerRows = weekRows(selected).length;
  const height = expanded ? centerRows * ROW_H : ROW_H;

  const onPointerDown = (event: React.PointerEvent) => {
    if (busy.current || (event.pointerType === "mouse" && event.button !== 0)) return;
    gesture.current = { x: event.clientX, y: event.clientY, t: performance.now(), axis: null };
    didDrag.current = false;
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const g = gesture.current;
    if (!g || busy.current) return;
    const moveX = event.clientX - g.x;
    const moveY = event.clientY - g.y;
    if (!g.axis) {
      if (Math.abs(moveX) < 8 && Math.abs(moveY) < 8) return;
      g.axis = Math.abs(moveX) > Math.abs(moveY) ? "x" : "y";
      didDrag.current = true;
    }
    if (g.axis === "x") setDx(moveX);
  };

  const finish = (event: React.PointerEvent) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g || !g.axis || busy.current) return;
    const moveX = event.clientX - g.x;
    const moveY = event.clientY - g.y;

    if (g.axis === "y") {
      if (!forceExpanded) {
        if (moveY > 24) setExpanded(true);
        else if (moveY < -24) setExpanded(false);
      }
      return;
    }

    const width = rootRef.current?.clientWidth ?? 360;
    const velocity = Math.abs(moveX) / Math.max(1, performance.now() - g.t);
    const commit = Math.abs(moveX) > width * 0.22 || (velocity > 0.45 && Math.abs(moveX) > 28);
    busy.current = true;
    setAnimating(true);
    if (commit) {
      const dir: 1 | -1 = moveX < 0 ? 1 : -1;
      setDx(-dir * width);
      timer.current = setTimeout(() => {
        setAnimating(false);
        setDx(0);
        busy.current = false;
        onSelect(step(dir));
      }, 190);
    } else {
      setDx(0);
      timer.current = setTimeout(() => {
        setAnimating(false);
        busy.current = false;
      }, 200);
    }
  };

  const panelProps = { expanded, selected, today, eventDates, onSelect };

  return (
    <div
      className="oc-shadow-strip relative z-10 rounded-b-[14px] bg-white"
      onClickCapture={(event) => {
        if (didDrag.current) {
          event.stopPropagation();
          event.preventDefault();
          didDrag.current = false;
        }
      }}
    >
      <div
        ref={rootRef}
        className="overflow-hidden"
        style={{ height, touchAction: "none", transition: "height 260ms cubic-bezier(0.2, 0, 0, 1)" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
      >
        <div
          className="flex w-[300%]"
          style={{
            transform: `translateX(calc(-33.3333% + ${dx}px))`,
            transition: animating ? "transform 190ms cubic-bezier(0.2, 0, 0, 1)" : "none",
          }}
        >
          <Panel anchor={step(-1)} {...panelProps} />
          <Panel anchor={selected} {...panelProps} />
          <Panel anchor={step(1)} {...panelProps} />
        </div>
      </div>
      {forceExpanded ? (
        <div className="h-3" />
      ) : (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-label={expanded ? "Hónap összecsukása" : "Hónap megnyitása"}
          aria-expanded={expanded}
          className="flex h-[22px] w-full items-center justify-center"
        >
          <span className="h-1 w-9 rounded-full bg-[#D1D1D1]" />
        </button>
      )}
    </div>
  );
}
