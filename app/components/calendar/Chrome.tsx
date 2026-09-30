"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  Calendar,
  CalendarDays,
  CalendarPlus,
  Car,
  Check,
  Columns3,
  List,
  LogOut,
  Mail,
  Menu,
  Plus,
  Search,
  Users,
} from "lucide-react";
import type { CalendarViewId } from "@/lib/calendar/types";
import { initials, roleLabel, type UserInfo } from "./Drawer";
import { useIsClient } from "./hooks";

export const VIEW_LABELS: Record<CalendarViewId, string> = {
  agenda: "Ügyrend",
  day: "Nap",
  threeDay: "3 nap",
  week: "Hét",
  month: "Hónap",
};

export function ViewIcon({ view, size = 22 }: { view: CalendarViewId; size?: number }) {
  if (view === "agenda") return <List size={size} />;
  if (view === "day") return <Calendar size={size} />;
  if (view === "threeDay") return <Columns3 size={size} />;
  return <CalendarDays size={size} />;
}

function Popover({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const mounted = useIsClient();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open || !mounted) return null;
  return createPortal(
    <div className="oc-root fixed inset-0 z-[55]" onClick={onClose}>
      <div
        className="oc-pop-in oc-shadow-pop absolute top-[calc(env(safe-area-inset-top)+52px)] right-2 min-w-[210px] rounded-[10px] bg-white py-1.5 lg:top-[52px]"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

export function ViewMenu({
  open,
  onClose,
  view,
  views,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  view: CalendarViewId;
  views: CalendarViewId[];
  onPick: (view: CalendarViewId) => void;
}) {
  return (
    <Popover open={open} onClose={onClose}>
      {views.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => {
            onPick(id);
            onClose();
          }}
          className="oc-ripple flex h-11 w-full items-center gap-3 px-4 text-left text-[15px] text-oc-ink"
        >
          <span className="text-oc-muted">
            <ViewIcon view={id} size={20} />
          </span>
          <span className="flex-1">{VIEW_LABELS[id]}</span>
          {view === id && <Check size={18} className="text-oc-blue" />}
        </button>
      ))}
    </Popover>
  );
}

export function AccountMenu({
  open,
  onClose,
  user,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  user: UserInfo;
  onLogout: () => void;
}) {
  return (
    <Popover open={open} onClose={onClose}>
      <div className="flex items-center gap-3 px-4 pt-2 pb-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-oc-blue text-[14px] font-medium text-white">
          {initials(user.name)}
        </span>
        <div className="min-w-0">
          <div className="truncate text-[15px] leading-[20px] font-medium text-oc-ink">{user.name}</div>
          <div className="truncate text-[12px] leading-[16px] text-oc-muted">{user.email}</div>
          <div className="text-[12px] leading-[16px] text-oc-muted">{roleLabel(user.role)}</div>
        </div>
      </div>
      <div className="mx-3 h-px bg-oc-line" />
      <button
        type="button"
        onClick={onLogout}
        className="oc-ripple mt-1 flex h-11 w-full items-center gap-3 px-4 text-left text-[15px] text-oc-ink"
      >
        <LogOut size={19} className="text-oc-muted" /> Kijelentkezés
      </button>
    </Popover>
  );
}

interface AppBarProps {
  title: string;
  view: CalendarViewId;
  user: UserInfo;
  filterActive: boolean;
  todayNumber?: number;
  onToday?: () => void;
  onMenu: () => void;
  onView: () => void;
  onSearch: () => void;
  onAccount: () => void;
}

export function AppBar({ title, view, user, filterActive, todayNumber, onToday, onMenu, onView, onSearch, onAccount }: AppBarProps) {
  const iconBtn = "oc-ripple-light relative flex h-11 w-11 items-center justify-center rounded-full";
  return (
    <div className="flex h-14 items-center pr-[2px] pl-[6px]">
      <button type="button" onClick={onMenu} aria-label="Menü" className={iconBtn}>
        <Menu size={22} />
        {filterActive && <span className="absolute top-[10px] right-[9px] h-2 w-2 rounded-full bg-[#FFB900] ring-2 ring-oc-blue" />}
      </button>
      <h1 className="ml-[7px] min-w-0 flex-1 truncate text-[20px] leading-[26px] font-normal">{title}</h1>
      {onToday && (
        <button type="button" onClick={onToday} aria-label="Ugrás mára" className={iconBtn}>
          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-[5px] border-[1.8px] border-white text-[11px] leading-none font-bold">
            {todayNumber}
          </span>
        </button>
      )}
      <button type="button" onClick={onView} aria-label="Nézet váltása" className={iconBtn}>
        <ViewIcon view={view} />
      </button>
      <button type="button" onClick={onSearch} aria-label="Keresés" className={iconBtn}>
        <Search size={22} />
      </button>
      <button type="button" onClick={onAccount} aria-label="Fiók" className={iconBtn}>
        <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white/25 text-[10.5px] font-medium tracking-tight">
          {initials(user.name)}
        </span>
      </button>
    </div>
  );
}

export function BottomNav({ pendingCount }: { pendingCount: number }) {
  const item = "oc-ripple relative flex flex-1 flex-col items-center justify-center gap-[3px] text-[12px] leading-[14px]";
  return (
    <nav className="oc-safe-bottom shrink-0 border-t border-oc-line bg-white" aria-label="Fő navigáció">
      <div className="flex h-[56px]">
        <Link href="/bookings" className={`${item} text-oc-muted`}>
          <span className="relative">
            <Mail size={23} strokeWidth={1.8} />
            {pendingCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#D13438] px-1 text-[10px] font-semibold text-white">
                {pendingCount > 99 ? "99+" : pendingCount}
              </span>
            )}
          </span>
          Foglalások
        </Link>
        <span className={`${item} font-medium text-oc-blue`} aria-current="page">
          <CalendarDays size={23} strokeWidth={2.1} />
          Naptár
        </span>
        <Link href="/drivers" className={`${item} text-oc-muted`}>
          <Users size={23} strokeWidth={1.8} />
          Sofőrök
        </Link>
      </div>
    </nav>
  );
}

export function Fab({ onNewBooking, onNewEvent }: { onNewBooking: () => void; onNewEvent: () => void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {open && <div className="oc-fade-in absolute inset-0 z-20 bg-white/70" onClick={() => setOpen(false)} aria-hidden />}
      <div className="absolute right-4 bottom-4 z-30 flex flex-col items-end gap-3">
        {open && (
          <>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onNewEvent();
              }}
              className="oc-pop-in oc-shadow-pop flex h-11 items-center gap-2 rounded-full bg-white pr-4 pl-3 text-[14px] font-medium text-oc-ink"
            >
              <CalendarPlus size={19} className="text-oc-blue" /> Szabadság / esemény
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onNewBooking();
              }}
              className="oc-pop-in oc-shadow-pop flex h-11 items-center gap-2 rounded-full bg-white pr-4 pl-3 text-[14px] font-medium text-oc-ink"
            >
              <Car size={19} className="text-oc-blue" /> Új út (foglalás)
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Bezárás" : "Új"}
          aria-expanded={open}
          className="oc-shadow-fab flex h-14 w-14 items-center justify-center rounded-full bg-oc-blue text-white transition-transform active:scale-95"
        >
          <Plus size={26} strokeWidth={2.2} className={`transition-transform duration-200 ${open ? "rotate-45" : ""}`} />
        </button>
      </div>
    </>
  );
}

export interface ToastData {
  id: number;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function Snackbar({ toast, onDismiss }: { toast: ToastData | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, toast.actionLabel ? 7000 : 3600);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);
  if (!toast) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[84px] z-40 flex justify-center px-3 lg:bottom-6" role="status" aria-live="polite">
      <div
        key={toast.id}
        className="oc-snack-in pointer-events-auto flex max-w-[460px] items-center gap-3 rounded-[8px] bg-[#323232] py-2.5 pr-2 pl-4 text-[14px] leading-[20px] text-white shadow-lg"
      >
        <span className="min-w-0 flex-1">{toast.text}</span>
        {toast.actionLabel && (
          <button
            type="button"
            onClick={() => {
              toast.onAction?.();
              onDismiss();
            }}
            className="h-8 shrink-0 rounded-full px-3 text-[14px] font-medium text-[#9DC3FF]"
          >
            {toast.actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="oc-root flex h-dvh flex-col bg-white">
      <div className="oc-safe-top bg-oc-blue text-white">
        <div className="flex h-14 items-center px-4 text-[20px]">Naptár</div>
        <div className="h-[38px]" />
      </div>
      <div className="h-[66px] rounded-b-[14px] bg-white oc-shadow-strip" />
      <div className="space-y-3 px-3 pt-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="oc-skeleton h-[40px] w-[58px] rounded" />
            <div className="oc-skeleton h-[52px] flex-1 rounded-[6px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
