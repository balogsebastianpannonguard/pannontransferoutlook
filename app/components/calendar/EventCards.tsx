"use client";

import type { CSSProperties } from "react";
import { ArrowRight, Car, ClipboardList, Clock, Plane, TreePalm, User, UserRoundX, Users } from "lucide-react";
import { formatClock, formatDuration, MS_MINUTE } from "@/lib/calendar/dates";
import { bookingRoute, partnerOf, shortVehicle } from "@/lib/calendar/mapping";
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

const CHIP_STYLES = {
  pending: { bg: "#FFF4CE", fg: "#7A5900", label: "Függőben" },
  modified: { bg: "#FDE4CC", fg: "#8A4B08", label: "Módosítva" },
  "in-progress": { bg: "#DEECF9", fg: "#0B4F8F", label: "Úton" },
  completed: { bg: "#E7F4E4", fg: "#0B5A0B", label: "Kész" },
  cancelled: { bg: "#FDE7E9", fg: "#A4262C", label: "Lemondva" },
} as const;

export function EventStatusChip({ event }: { event: CalEvent }) {
  const booking = event.booking;
  if (!booking) return null;
  const key = event.cancelled ? "cancelled" : booking.status;
  const style = CHIP_STYLES[key as keyof typeof CHIP_STYLES];
  if (!style) return null;
  return (
    <span
      className="shrink-0 rounded-full px-2 py-[2px] text-[12px] leading-[16px] font-semibold"
      style={{ background: style.bg, color: style.fg }}
    >
      {style.label}
    </span>
  );
}

export function TimeColumn({ event }: { event: CalEvent }) {
  if (event.allDay) {
    return (
      <div className="w-[70px] shrink-0 pt-[6px] pr-2">
        <div className="text-[11.5px] leading-[14px] font-bold tracking-[0.01em] whitespace-nowrap text-oc-ink uppercase">Egész nap</div>
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
      <div className="mt-[7px] text-[18px] leading-[22px] font-bold tracking-[-0.015em] text-oc-ink tabular-nums">
        {formatClock(event.start)}
      </div>
      {event.booking ? (
        <div className="mt-[2px] text-[12px] leading-[16px] text-oc-muted tabular-nums">→ {formatClock(event.end)}</div>
      ) : (
        <div className="mt-[2px] text-[12px] leading-[16px] text-oc-muted">{formatDuration(minutes)}</div>
      )}
    </div>
  );
}

interface CardProps {
  event: CalEvent;
  onOpen: (event: CalEvent) => void;
}

export function EventCard({ event, onOpen }: CardProps) {
  if (event.allDay) return <AllDayCard event={event} onOpen={onOpen} />;
  const booking = event.booking;
  if (booking) return <BookingCard event={event} onOpen={onOpen} />;
  const strike = event.cancelled ? "line-through decoration-[1px]" : "";
  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      className="oc-card flex min-h-[56px] w-full items-stretch gap-2 rounded-[12px] px-[12px] py-[9px] text-left"
      style={eventSurface(event)}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-[6px]">
          {event.icon === "clipboard" && <ClipboardList size={15} strokeWidth={2} className="shrink-0" />}
          <span className={`truncate text-[15.5px] leading-[20px] font-semibold tracking-[-0.005em] ${strike}`}>{event.title}</span>
        </div>
        {event.subtitle && (
          <div className={`mt-[2px] truncate text-[13.5px] leading-[18px] opacity-80 ${strike}`}>{event.subtitle}</div>
        )}
      </div>
    </button>
  );
}

/** Egy út kártyája: első pillantásra látszik a partner, az útvonal, az autó+sofőr és a létszám. */
function BookingCard({ event, onOpen }: CardProps) {
  const b = event.booking!;
  const route = bookingRoute(b);
  const meta = partnerOf(b);
  const client = meta ? meta.short.toUpperCase() : b.companyName || b.travelerName.trim().split(/\s+/).slice(0, 2).join(" ");
  const strike = event.cancelled ? "line-through decoration-[1px]" : "";
  const vehicle = shortVehicle(b.vehicleName);
  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      className="oc-card flex min-h-[78px] w-full flex-col gap-[5px] rounded-[12px] px-[12px] py-[10px] text-left"
      style={eventSurface(event)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className={`flex min-w-0 flex-wrap items-center gap-x-[7px] text-[16px] leading-[21px] font-bold tracking-[-0.01em] ${strike}`}>
          <span className="shrink-0">{client}</span>
          <span className="flex min-w-0 items-center gap-[5px] font-semibold">
            {route.from.short}
            <ArrowRight size={15} strokeWidth={2.4} className="shrink-0 opacity-70" />
            {route.to.short}
          </span>
        </div>
        <EventStatusChip event={event} />
      </div>

      <div className={`flex flex-wrap items-center gap-x-[12px] gap-y-[3px] text-[14px] leading-[19px] font-medium ${strike}`}>
        <span className="flex items-center gap-[4px]">
          <Users size={14} strokeWidth={2.1} className="opacity-70" />
          {b.travelers}
        </span>
        {b.driverName ? (
          <>
            <span className="flex min-w-0 items-center gap-[4px]">
              <User size={14} strokeWidth={2.1} className="shrink-0 opacity-70" />
              <span className="truncate">{b.driverName}</span>
            </span>
            {vehicle && (
              <span className="flex min-w-0 items-center gap-[4px]">
                <Car size={14} strokeWidth={2.1} className="shrink-0 opacity-70" />
                <span className="truncate">{vehicle}</span>
              </span>
            )}
          </>
        ) : (
          event.unassigned && (
            <span className="flex items-center gap-[4px] rounded-full bg-[#B3261E] px-2 py-[1px] text-[12.5px] font-semibold text-white">
              <UserRoundX size={13} strokeWidth={2.4} />
              Nincs sofőr
            </span>
          )
        )}
        {b.flightNumber && (
          <span className="flex items-center gap-[4px]">
            <Plane size={14} strokeWidth={2.1} className="opacity-70" />
            {b.flightNumber}
          </span>
        )}
      </div>

      <div className={`line-clamp-2 text-[13px] leading-[17px] opacity-75 ${strike}`}>
        {b.fromAddress} → {b.toAddress}
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
      className="oc-card flex min-h-[46px] w-full items-center gap-2 rounded-[12px] border-[1.5px] px-3 text-left"
      style={style}
    >
      {leave && <TreePalm size={15} strokeWidth={2} className="shrink-0" />}
      <span className="truncate text-[15px] leading-[19px] font-semibold">{event.title}</span>
      {event.custom?.driverName && event.custom.driverName !== event.title && (
        <span className="ml-auto shrink-0 text-[13px] opacity-80">{event.custom.driverName}</span>
      )}
    </button>
  );
}

export function NowPill({ children, clock }: { children: React.ReactNode; clock?: boolean }) {
  return (
    <div className="oc-fab-grad mb-2 ml-[82px] flex h-[26px] w-fit items-center gap-[6px] rounded-full px-[13px] text-[13px] leading-none font-semibold text-white shadow-[0_4px_12px_-4px_rgba(15,108,189,0.6)]">
      {clock && <Clock size={12} strokeWidth={2.4} />}
      {children}
    </div>
  );
}

export function formatCountdown(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / MS_MINUTE));
  return formatDuration(minutes);
}
