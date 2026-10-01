"use client";

import type { CSSProperties } from "react";
import { ClipboardList, Clock, TreePalm, UserRoundX } from "lucide-react";
import { formatClock, formatDuration, MS_MINUTE } from "@/lib/calendar/dates";
import { ALL_DAY_TONE, TONES } from "@/lib/calendar/tones";
import type { CalEvent } from "@/lib/calendar/types";

/** Visual style shared by every timed event surface (agenda card, timeline block, month chip). */
export function eventSurface(event: CalEvent): CSSProperties {
  const tone = TONES[event.cancelled ? "gray" : event.tone];
  const style: CSSProperties = {
    backgroundColor: tone.bg,
    borderLeft: `4px solid ${tone.border}`,
    color: tone.text,
  };
  if (event.tentative && !event.cancelled) {
    style.backgroundImage = `repeating-linear-gradient(135deg, ${tone.bg} 0px, ${tone.bg} 5px, #FFFFFF 5px, #FFFFFF 10px)`;
    style.backgroundColor = "#FFFFFF";
    style.border = `1.5px solid ${tone.border}`;
    style.borderLeft = `4px solid ${tone.border}`;
  }
  return style;
}

export function EventStatusChip({ event }: { event: CalEvent }) {
  const booking = event.booking;
  if (!booking) return null;
  if (event.cancelled) return <Chip>Lemondva</Chip>;
  if (booking.status === "pending") return <Chip strong>Függőben</Chip>;
  if (booking.status === "modified") return <Chip strong>Módosítva</Chip>;
  if (booking.status === "in-progress") return <Chip strong>Úton</Chip>;
  if (booking.status === "completed") return <Chip>Kész</Chip>;
  return null;
}

function Chip({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <span
      className={`shrink-0 rounded-full px-1.5 py-[1px] text-[10.5px] leading-[14px] font-medium ${
        strong ? "bg-white/90 text-oc-ink shadow-[0_0_0_1px_rgba(0,0,0,0.05)]" : "bg-white/70 text-oc-muted"
      }`}
    >
      {children}
    </span>
  );
}

export function TimeColumn({ event }: { event: CalEvent }) {
  if (event.allDay) {
    return (
      <div className="w-[70px] shrink-0 pt-[6px] pr-2">
        <div className="text-[10.5px] leading-[14px] font-bold tracking-[0.01em] whitespace-nowrap text-oc-ink uppercase">Egész nap</div>
        {event.dayCount && event.dayCount > 1 ? (
          <div className="mt-[3px] text-[12px] leading-[16px] text-oc-muted">
            {event.dayIndex ?? 1}/{event.dayCount}. nap
          </div>
        ) : null}
      </div>
    );
  }
  const minutes = Math.round((event.end - event.start) / MS_MINUTE);
  return (
    <div className="w-[70px] shrink-0 pr-2">
      <div className="mt-[8px] text-[15px] leading-[18px] font-semibold tracking-[-0.01em] text-oc-ink tabular-nums">
        {formatClock(event.start)}
      </div>
      <div className="mt-[3px] text-[12px] leading-[16px] text-oc-muted">{formatDuration(minutes)}</div>
    </div>
  );
}

interface CardProps {
  event: CalEvent;
  onOpen: (event: CalEvent) => void;
}

export function EventCard({ event, onOpen }: CardProps) {
  if (event.allDay) return <AllDayCard event={event} onOpen={onOpen} />;
  const strike = event.cancelled ? "line-through decoration-[1px]" : "";
  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      className="oc-card flex min-h-[56px] w-full items-stretch gap-2 rounded-[10px] px-[12px] py-[9px] text-left"
      style={eventSurface(event)}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-[6px]">
          {event.icon === "clipboard" && <ClipboardList size={14} strokeWidth={2} className="shrink-0" />}
          <span className={`truncate text-[14.5px] leading-[19px] font-semibold tracking-[-0.005em] ${strike}`}>{event.title}</span>
        </div>
        {event.subtitle && (
          <div className={`mt-[2px] truncate text-[12.5px] leading-[16px] opacity-80 ${strike}`}>{event.subtitle}</div>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between gap-1">
        <EventStatusChip event={event} />
        {event.unassigned && !event.cancelled && (
          <span className="flex items-center gap-0.5 text-[10.5px] leading-[14px] font-semibold text-[#B3261E]">
            <UserRoundX size={12} strokeWidth={2.4} />
            Nincs sofőr
          </span>
        )}
      </div>
    </button>
  );
}

export function AllDayCard({ event, onOpen }: CardProps) {
  const leave = event.icon === "palm";
  const useGreen = event.tone === "green" || event.tone === "sky";
  const tone = TONES[event.tone];
  const style: CSSProperties = useGreen
    ? { borderColor: ALL_DAY_TONE.border, color: ALL_DAY_TONE.text, backgroundColor: ALL_DAY_TONE.bg }
    : { borderColor: tone.border, color: tone.text, backgroundColor: tone.bg };
  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      className="oc-card flex h-[42px] w-full items-center gap-2 rounded-[10px] border-[1.5px] px-3 text-left"
      style={style}
    >
      {leave && <TreePalm size={15} strokeWidth={2} className="shrink-0" />}
      <span className="truncate text-[14px] leading-[18px] font-medium">{event.title}</span>
      {event.custom?.driverName && event.custom.driverName !== event.title && (
        <span className="ml-auto shrink-0 text-[12px] opacity-75">{event.custom.driverName}</span>
      )}
    </button>
  );
}

export function NowPill({ children, clock }: { children: React.ReactNode; clock?: boolean }) {
  return (
    <div className="oc-fab-grad mb-2 ml-[82px] flex h-[26px] w-fit items-center gap-[6px] rounded-full px-[13px] text-[12.5px] leading-none font-semibold text-white shadow-[0_4px_12px_-4px_rgba(15,108,189,0.6)]">
      {clock && <Clock size={12} strokeWidth={2.4} />}
      {children}
    </div>
  );
}

export function formatCountdown(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / MS_MINUTE));
  return formatDuration(minutes);
}
