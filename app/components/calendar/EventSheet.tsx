"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  Building2,
  CalendarClock,
  Car,
  ExternalLink,
  Luggage,
  MapPin,
  Navigation,
  Pencil,
  Phone,
  Plane,
  StickyNote,
  Trash2,
  User,
  UserRoundX,
  Users,
  X,
} from "lucide-react";
import { bookingRoute, partnerOf } from "@/lib/calendar/mapping";
import { formatClock, formatDuration, longDate, MS_MINUTE, parseYmd } from "@/lib/calendar/dates";
import { TONES } from "@/lib/calendar/tones";
import type { CalEvent, CustomEventDTO } from "@/lib/calendar/types";
import Sheet from "./Sheet";
import { loadStaff, type StaffLists } from "./staff";

interface Props {
  event: CalEvent | null;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
  onToast: (message: string) => void;
  onEditCustom: (dto: CustomEventDTO) => void;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Függőben",
  modified: "Módosítva",
  confirmed: "Megerősítve",
  "in-progress": "Úton",
  completed: "Teljesítve",
  cancelled: "Lemondva",
};

const PAYMENT_LABEL: Record<string, string> = {
  cash: "Készpénz",
  card: "Kártya",
  transfer: "Átutalás",
  invoice: "Számla",
};

function Row({ icon, children, action }: { icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-4 py-[9px]">
      <span className="mt-[2px] shrink-0 text-oc-muted">{icon}</span>
      <div className="min-w-0 flex-1 text-[14px] leading-[20px] text-oc-ink">{children}</div>
      {action}
    </div>
  );
}

export default function EventSheet({ event, onClose, onChanged, onToast, onEditCustom }: Props) {
  return (
    <Sheet open={!!event} onClose={onClose} label={event?.title ?? "Esemény"}>
      {event &&
        (event.source === "booking" && event.booking ? (
          <BookingDetails key={event.key} event={event} onClose={onClose} onChanged={onChanged} onToast={onToast} />
        ) : event.custom ? (
          <CustomDetails
            key={event.key}
            event={event}
            dto={event.custom}
            onClose={onClose}
            onChanged={onChanged}
            onToast={onToast}
            onEdit={onEditCustom}
          />
        ) : null)}
    </Sheet>
  );
}

function SheetHeader({ event, onClose, kicker }: { event: CalEvent; onClose: () => void; kicker?: string }) {
  const tone = TONES[event.cancelled ? "gray" : event.tone];
  return (
    <div className="flex items-start gap-3 px-4 pt-1 pb-3" style={{ borderBottom: "1px solid #EDEDED" }}>
      <span className="mt-[3px] h-[38px] w-[5px] shrink-0 rounded-full" style={{ background: tone.border }} />
      <div className="min-w-0 flex-1">
        {kicker && <div className="text-[12px] leading-[16px] font-medium text-oc-muted">{kicker}</div>}
        <h2 className={`text-[19px] leading-[25px] font-semibold text-oc-ink ${event.cancelled ? "line-through" : ""}`}>
          {event.title}
        </h2>
        {event.subtitle && <div className="mt-0.5 text-[13px] leading-[18px] text-oc-muted">{event.subtitle}</div>}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Bezárás"
        className="oc-ripple -mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-oc-muted"
      >
        <X size={20} />
      </button>
    </div>
  );
}

function BookingDetails({
  event,
  onClose,
  onChanged,
  onToast,
}: {
  event: CalEvent;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
  onToast: (message: string) => void;
}) {
  const booking = event.booking!;
  const route = useMemo(() => bookingRoute(booking), [booking]);
  const partner = partnerOf(booking);
  const [staff, setStaff] = useState<StaffLists | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [driverId, setDriverId] = useState(booking.driverId ?? "");
  const [vehicleId, setVehicleId] = useState(booking.vehicleId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    let alive = true;
    loadStaff().then((lists) => alive && setStaff(lists));
    return () => {
      alive = false;
    };
  }, []);

  const date = parseYmd(booking.pickupDate);
  const minutes = Math.round((event.end - event.start) / MS_MINUTE);
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(booking.fromAddress)}&destination=${encodeURIComponent(booking.toAddress)}`;
  const closed = booking.status === "cancelled" || booking.status === "completed";

  async function call(url: string, body: unknown): Promise<Response> {
    return fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function assign(force = false) {
    const driver = staff?.drivers.find((d) => d._id === driverId);
    const vehicle = staff?.vehicles.find((v) => v._id === vehicleId);
    if (!driver || !vehicle) {
      setError("Válassz sofőrt és járművet is.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await call(`/api/bookings/${booking.id}/assign`, {
        driverId: driver._id,
        driverName: driver.name,
        vehicleId: vehicle._id,
        vehicleName: vehicle.name,
        forceOverride: force,
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setConflict(true);
        setError(data.error || "Ütközés a kiosztásban.");
        return;
      }
      if (!res.ok) throw new Error(data.error || "A kiosztás nem sikerült.");
      onToast("Kiosztva: " + driver.name);
      await onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hiba történt.");
    } finally {
      setBusy(false);
    }
  }

  async function release() {
    setBusy(true);
    setError(null);
    try {
      const res = await call(`/api/bookings/${booking.id}/assign`, {});
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "A visszavonás nem sikerült.");
      onToast("Kiosztás visszavonva");
      await onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hiba történt.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelBooking() {
    setBusy(true);
    setError(null);
    try {
      const res = await call(`/api/bookings/${booking.id}/status`, {
        status: "cancelled",
        details: "Lemondva a naptárból",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "A lemondás nem sikerült.");
      onToast("Út lemondva");
      await onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hiba történt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SheetHeader event={event} onClose={onClose} kicker={`${STATUS_LABEL[booking.status] ?? booking.status} · ${booking.code}`} />

      <div className="oc-scroll min-h-0 flex-1 overflow-y-auto pb-2">
        <Row icon={<CalendarClock size={18} />}>
          <div className="font-medium">{longDate(date)}</div>
          <div className="text-oc-muted">
            {formatClock(event.start)} – {formatClock(event.end)} · kb. {formatDuration(minutes)}
          </div>
        </Row>

        <Row
          icon={<MapPin size={18} />}
          action={
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Útvonal megnyitása"
              className="oc-ripple flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-oc-blue"
            >
              <Navigation size={18} />
            </a>
          }
        >
          <div className="font-medium">{route.from.short} → {route.to.short}</div>
          <div className="text-oc-muted">{booking.fromAddress}</div>
          <div className="text-oc-muted">→ {booking.toAddress}</div>
        </Row>

        <Row
          icon={<User size={18} />}
          action={
            booking.travelerPhone ? (
              <a
                href={`tel:${booking.travelerPhone.replace(/\s+/g, "")}`}
                aria-label="Hívás"
                className="oc-ripple flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-oc-blue"
              >
                <Phone size={18} />
              </a>
            ) : undefined
          }
        >
          <div className="font-medium">{booking.travelerName || "—"}</div>
          {booking.travelerPhone && <div className="text-oc-muted">{booking.travelerPhone}</div>}
          {booking.travelerEmail && <div className="truncate text-oc-muted">{booking.travelerEmail}</div>}
        </Row>

        {(partner || booking.companyName) && (
          <Row icon={<Building2 size={18} />}>{partner?.name || booking.companyName}</Row>
        )}

        <Row icon={<Users size={18} />}>
          {booking.travelers} fő
          {booking.luggage > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-oc-muted">
              <Luggage size={14} /> {booking.luggage} db
            </span>
          )}
        </Row>

        {booking.flightNumber && <Row icon={<Plane size={18} />}>{booking.flightNumber}</Row>}

        {typeof booking.price === "number" && booking.price > 0 && (
          <Row icon={<Banknote size={18} />}>
            {new Intl.NumberFormat("hu-HU").format(booking.price)} Ft
            {booking.paymentMethod && (
              <span className="ml-2 text-oc-muted">{PAYMENT_LABEL[booking.paymentMethod] ?? booking.paymentMethod}</span>
            )}
          </Row>
        )}

        {booking.comment && (
          <Row icon={<StickyNote size={18} />}>
            <span className="whitespace-pre-wrap">{booking.comment}</span>
          </Row>
        )}

        <div className="mx-4 my-2 h-px bg-[#EDEDED]" />

        <Row icon={booking.driverName ? <Car size={18} /> : <UserRoundX size={18} className="text-[#B3261E]" />}>
          {booking.driverName ? (
            <>
              <div className="font-medium">{booking.driverName}</div>
              {booking.vehicleName && <div className="text-oc-muted">{booking.vehicleName}</div>}
            </>
          ) : (
            <span className="font-medium text-[#B3261E]">Nincs sofőr kiosztva</span>
          )}
        </Row>

        {assigning && !closed && (
          <div className="mx-4 mb-2 space-y-2 rounded-[10px] bg-oc-surface p-3">
            <label className="block text-[12px] font-medium text-oc-muted">
              Sofőr
              <select
                value={driverId}
                onChange={(e) => {
                  setDriverId(e.target.value);
                  setConflict(false);
                  setError(null);
                }}
                className="mt-1 h-10 w-full rounded-[8px] border border-oc-line bg-white px-2 text-[14px] text-oc-ink"
              >
                <option value="">Válassz…</option>
                {staff?.drivers.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[12px] font-medium text-oc-muted">
              Jármű
              <select
                value={vehicleId}
                onChange={(e) => {
                  setVehicleId(e.target.value);
                  setConflict(false);
                  setError(null);
                }}
                className="mt-1 h-10 w-full rounded-[8px] border border-oc-line bg-white px-2 text-[14px] text-oc-ink"
              >
                <option value="">Válassz…</option>
                {staff?.vehicles.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.name}
                    {v.plates ? ` · ${v.plates}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={busy}
                onClick={() => assign(conflict)}
                className="h-10 flex-1 rounded-full bg-oc-blue text-[14px] font-medium text-white disabled:opacity-50"
              >
                {conflict ? "Kiosztás mégis" : "Kiosztás"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAssigning(false);
                  setError(null);
                  setConflict(false);
                }}
                className="h-10 rounded-full px-4 text-[14px] font-medium text-oc-blue"
              >
                Mégse
              </button>
            </div>
          </div>
        )}

        {error && (
          <div role="alert" className="mx-4 mb-2 rounded-[8px] bg-[#FDECEA] px-3 py-2 text-[13px] leading-[18px] text-[#8C1D18]">
            {error}
          </div>
        )}
      </div>

      <div className="oc-safe-bottom shrink-0 border-t border-[#EDEDED] bg-white px-3 py-2">
        {confirmCancel ? (
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 text-[13px] leading-[17px] text-oc-ink">
              Biztosan lemondod? Az utas értesítést kaphat.
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={cancelBooking}
              className="h-10 rounded-full bg-[#B3261E] px-4 text-[14px] font-medium text-white disabled:opacity-50"
            >
              Lemondás
            </button>
            <button type="button" onClick={() => setConfirmCancel(false)} className="h-10 rounded-full px-3 text-[14px] font-medium text-oc-blue">
              Vissza
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-0.5">
            <Link
              href={`/bookings/${booking.id}`}
              className="oc-ripple flex h-10 items-center gap-1.5 rounded-full px-3 text-[14px] font-medium text-oc-blue"
            >
              <ExternalLink size={16} /> Részletek
            </Link>
            {!closed && !assigning && (
              <button
                type="button"
                onClick={() => setAssigning(true)}
                className="oc-ripple flex h-10 items-center gap-1.5 rounded-full px-3 text-[14px] font-medium text-oc-blue"
              >
                {booking.driverName ? "Átosztás" : "Kiosztás"}
              </button>
            )}
            {!closed && booking.driverName && !assigning && (
              <button
                type="button"
                disabled={busy}
                onClick={release}
                className="oc-ripple flex h-10 items-center gap-1.5 rounded-full px-3 text-[14px] font-medium text-oc-muted disabled:opacity-50"
              >
                Visszavonás
              </button>
            )}
            {!closed && (
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                className="oc-ripple ml-auto flex h-10 items-center gap-1.5 rounded-full px-3 text-[14px] font-medium text-[#B3261E]"
              >
                Lemondás
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function CustomDetails({
  event,
  dto,
  onClose,
  onChanged,
  onToast,
  onEdit,
}: {
  event: CalEvent;
  dto: CustomEventDTO;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
  onToast: (message: string) => void;
  onEdit: (dto: CustomEventDTO) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = parseYmd(dto.startDate);
  const end = parseYmd(dto.endDate);
  const sameDay = dto.startDate === dto.endDate;

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/calendar-events/${dto.id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "A törlés nem sikerült.");
      }
      onToast("Esemény törölve");
      await onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hiba történt.");
      setBusy(false);
    }
  }

  return (
    <>
      <SheetHeader event={event} onClose={onClose} kicker={dto.kind === "leave" ? "Szabadság" : "Esemény"} />
      <div className="oc-scroll min-h-0 flex-1 overflow-y-auto pb-2">
        <Row icon={<CalendarClock size={18} />}>
          <div className="font-medium">
            {sameDay ? longDate(start) : `${longDate(start)} –`}
          </div>
          {!sameDay && <div className="font-medium">{longDate(end)}</div>}
          <div className="text-oc-muted">
            {dto.allDay ? "Egész nap" : `${dto.startTime ?? ""}${dto.endTime ? ` – ${dto.endTime}` : ""}`}
          </div>
        </Row>
        {dto.driverName && <Row icon={<User size={18} />}>{dto.driverName}</Row>}
        {dto.notes && (
          <Row icon={<StickyNote size={18} />}>
            <span className="whitespace-pre-wrap">{dto.notes}</span>
          </Row>
        )}
        {dto.createdBy && <div className="px-4 py-1 text-[12px] text-oc-muted">Létrehozta: {dto.createdBy}</div>}
        {error && (
          <div role="alert" className="mx-4 my-2 rounded-[8px] bg-[#FDECEA] px-3 py-2 text-[13px] text-[#8C1D18]">
            {error}
          </div>
        )}
      </div>
      <div className="oc-safe-bottom flex shrink-0 items-center gap-1 border-t border-[#EDEDED] px-3 py-2">
        {confirming ? (
          <>
            <span className="min-w-0 flex-1 text-[13px] text-oc-ink">Biztosan törlöd?</span>
            <button
              type="button"
              disabled={busy}
              onClick={remove}
              className="h-10 rounded-full bg-[#B3261E] px-4 text-[14px] font-medium text-white disabled:opacity-50"
            >
              Törlés
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="h-10 rounded-full px-3 text-[14px] font-medium text-oc-blue">
              Vissza
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(dto);
              }}
              className="oc-ripple flex h-10 items-center gap-1.5 rounded-full px-3 text-[14px] font-medium text-oc-blue"
            >
              <Pencil size={16} /> Szerkesztés
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="oc-ripple ml-auto flex h-10 items-center gap-1.5 rounded-full px-3 text-[14px] font-medium text-[#B3261E]"
            >
              <Trash2 size={16} /> Törlés
            </button>
          </>
        )}
      </div>
    </>
  );
}
