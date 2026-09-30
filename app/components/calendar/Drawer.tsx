"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { CalendarDays, Car, LogOut, Mail, Plus, Users, X } from "lucide-react";
import { getAllPartnerMeta } from "@/lib/partner-meta";
import { PARTNER_TONES, TONES } from "@/lib/calendar/tones";
import { DEFAULT_FILTERS, type CalendarFilters } from "@/lib/calendar/types";
import { useIsClient } from "./hooks";
import { loadStaff, type StaffDriver } from "./staff";

export interface UserInfo {
  name: string;
  email: string;
  role: string;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const letters = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0];
  return letters.toUpperCase();
}

export function roleLabel(role: string): string {
  return role === "admin" ? "Adminisztrátor" : "Diszpécser";
}

export function filtersActive(filters: CalendarFilters): boolean {
  return (
    filters.partners.length > 0 || filters.drivers.length > 0 || !filters.showCancelled || filters.onlyUnassigned
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  user: UserInfo;
  pendingCount: number;
  filters: CalendarFilters;
  onFilters: (filters: CalendarFilters) => void;
  onLogout: () => void;
  onNewBooking: () => void;
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function FilterChip({
  active,
  onClick,
  children,
  color,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors ${
        active ? "border-oc-blue bg-oc-tint text-oc-blue-dark" : "border-oc-line bg-white text-oc-ink"
      }`}
    >
      {color && <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />}
      {children}
    </button>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between py-2 text-left"
    >
      <span className="text-[14px] text-oc-ink">{label}</span>
      <span className={`relative h-[24px] w-[42px] rounded-full transition-colors ${checked ? "bg-oc-blue" : "bg-[#BDBDBD]"}`}>
        <span
          className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-all ${checked ? "left-[21px]" : "left-[3px]"}`}
        />
      </span>
    </button>
  );
}

export function FiltersPanel({
  filters,
  onFilters,
  drivers,
}: {
  filters: CalendarFilters;
  onFilters: (filters: CalendarFilters) => void;
  drivers: StaffDriver[];
}) {
  const partners = getAllPartnerMeta();
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold tracking-wide text-oc-muted uppercase">Szűrők</h3>
        {filtersActive(filters) && (
          <button type="button" onClick={() => onFilters(DEFAULT_FILTERS)} className="text-[13px] font-medium text-oc-blue">
            Törlés
          </button>
        )}
      </div>

      <div className="mb-1 text-[12px] font-medium text-oc-muted">Partner</div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {partners.map((p) => (
          <FilterChip
            key={p.id}
            active={filters.partners.includes(p.id)}
            color={TONES[PARTNER_TONES[p.id] ?? "sky"].border}
            onClick={() => onFilters({ ...filters, partners: toggle(filters.partners, p.id) })}
          >
            {p.short}
          </FilterChip>
        ))}
        <FilterChip
          active={filters.partners.includes("other")}
          color={TONES.sky.border}
          onClick={() => onFilters({ ...filters, partners: toggle(filters.partners, "other") })}
        >
          Egyéb
        </FilterChip>
      </div>

      {drivers.length > 0 && (
        <>
          <div className="mb-1 text-[12px] font-medium text-oc-muted">Sofőr</div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {drivers.map((d) => (
              <FilterChip
                key={d._id}
                active={filters.drivers.includes(d.name)}
                onClick={() => onFilters({ ...filters, drivers: toggle(filters.drivers, d.name) })}
              >
                {d.name}
              </FilterChip>
            ))}
          </div>
        </>
      )}

      <Switch
        label="Lemondott utak mutatása"
        checked={filters.showCancelled}
        onChange={(v) => onFilters({ ...filters, showCancelled: v })}
      />
      <Switch
        label="Csak sofőr nélküli utak"
        checked={filters.onlyUnassigned}
        onChange={(v) => onFilters({ ...filters, onlyUnassigned: v })}
      />
    </div>
  );
}

export default function Drawer({ open, onClose, user, pendingCount, filters, onFilters, onLogout, onNewBooking }: Props) {
  const [drivers, setDrivers] = useState<StaffDriver[]>([]);
  const mounted = useIsClient();
  useEffect(() => {
    if (open) loadStaff().then((lists) => setDrivers(lists.drivers));
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const navItem = "oc-ripple flex h-12 items-center gap-4 rounded-full px-4 text-[15px] font-medium text-oc-ink";

  return createPortal(
    <div className="oc-root fixed inset-0 z-[65]">
      <div className="oc-fade-in absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menü"
        className="oc-drawer-in oc-shadow-sheet absolute inset-y-0 left-0 flex w-[min(320px,86vw)] flex-col bg-white"
      >
        <div className="oc-safe-top bg-oc-blue px-4 pt-4 pb-4 text-white">
          <div className="flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-[17px] font-medium">
              {initials(user.name)}
            </div>
            <button type="button" onClick={onClose} aria-label="Bezárás" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/15">
              <X size={20} />
            </button>
          </div>
          <div className="mt-3 text-[17px] leading-[22px] font-medium">{user.name}</div>
          <div className="truncate text-[13px] leading-[18px] opacity-85">{user.email}</div>
          <div className="mt-1 text-[12px] opacity-75">{roleLabel(user.role)}</div>
        </div>

        <div className="oc-scroll min-h-0 flex-1 overflow-y-auto px-2 py-2">
          <div className="flex h-12 items-center gap-4 rounded-full bg-oc-tint px-4 text-[15px] font-semibold text-oc-blue-dark">
            <CalendarDays size={20} /> Naptár
          </div>
          <Link href="/bookings" className={navItem}>
            <Mail size={20} className="text-oc-muted" /> Foglalások
            {pendingCount > 0 && (
              <span className="ml-auto rounded-full bg-oc-blue px-2 py-0.5 text-[12px] text-white">{pendingCount}</span>
            )}
          </Link>
          <Link href="/drivers" className={navItem}>
            <Users size={20} className="text-oc-muted" /> Sofőrök
          </Link>
          <Link href="/vehicles" className={navItem}>
            <Car size={20} className="text-oc-muted" /> Járművek
          </Link>
          <button
            type="button"
            onClick={() => {
              onClose();
              onNewBooking();
            }}
            className={`${navItem} w-full text-left`}
          >
            <Plus size={20} className="text-oc-muted" /> Új foglalás
          </button>

          <div className="mx-2 my-3 h-px bg-oc-line" />

          <div className="px-2">
            <FiltersPanel filters={filters} onFilters={onFilters} drivers={drivers} />
          </div>
        </div>

        <div className="oc-safe-bottom border-t border-oc-line p-2">
          <button type="button" onClick={onLogout} className="oc-ripple flex h-12 w-full items-center gap-4 rounded-full px-4 text-[15px] font-medium text-oc-ink">
            <LogOut size={20} className="text-oc-muted" /> Kijelentkezés
          </button>
        </div>
      </aside>
    </div>,
    document.body
  );
}
