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
        className="oc-pop-in oc-shadow-pop absolute top-[calc(env(safe-area-inset-top)+52px)] right-2 min-w-[220px] rounded-[14px] bg-white py-1.5 lg:top-[52px]"
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
  /** Mobilon a fiók a menüből (avatar) érhető el */
  onAccount?: () => void;
}

export function AppBar({ title, view, user, filterActive, todayNumber, onToday, onMenu, onView, onSearch }: AppBarProps) {
  const iconBtn = "oc-ripple-light relative flex h-11 w-11 items-center justify-center rounded-full transition-transform active:scale-90";
  return (
    <div className="flex h-[58px] items-center pr-[2px] pl-[10px]">
      <button type="button" onClick={onMenu} aria-label="Menü" className="relative flex h-11 w-11 items-center justify-center rounded-full transition-transform active:scale-90">
        <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white/95 text-[12.5px] font-semibold tracking-tight text-oc-blue shadow-[0_2px_8px_rgba(0,0,0,0.18)]">
          {initials(user.name)}
        </span>
        <span className="absolute right-[2px] bottom-[2px] flex h-[15px] w-[15px] items-center justify-center rounded-full bg-white text-oc-blue ring-[1.5px] ring-oc-blue">
          <Menu size={9} strokeWidth={3} />
        </span>
        {filterActive && <span className="absolute top-[4px] right-[4px] h-2.5 w-2.5 rounded-full bg-[#FFB900] ring-2 ring-oc-blue" />}
      </button>
      <h1 className="ml-[10px] min-w-0 flex-1 truncate text-[22px] leading-[28px] font-semibold tracking-[-0.01em] capitalize">{title}</h1>
      {onToday && (
        <button type="button" onClick={onToday} aria-label="Ugrás mára" className={iconBtn}>
          <span className="flex h-[23px] w-[23px] items-center justify-center rounded-[6px] border-[1.8px] border-white text-[11px] leading-none font-bold">
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
    </div>
  );
}

export function BottomNav({ pendingCount }: { pendingCount: number }) {
  const item = "relative flex flex-1 flex-col items-center justify-center gap-[3px] text-[11.5px] leading-[14px] font-medium transition-transform active:scale-95";
  return (
    <nav className="oc-safe-bottom oc-glass-nav relative z-20 shrink-0 border-t border-black/[0.06]" aria-label="Fő navigáció">
      <div className="flex h-[60px]">
        <Link href="/bookings" className={`${item} text-oc-muted`}>
          <span className="relative flex h-[30px] w-[56px] items-center justify-center rounded-full">
            <Mail size={22} strokeWidth={1.8} />
            {pendingCount > 0 && (
              <span className="absolute -top-0.5 right-[6px] flex h-[17px] min-w-[17px] ring-2 ring-white items-center justify-center rounded-full bg-[#D13438] px-1 text-[10px] font-semibold text-white">
                {pendingCount > 99 ? "99+" : pendingCount}
              </span>
            )}
          </span>
          Foglalások
        </Link>
        <span className={`${item} font-semibold text-oc-blue`} aria-current="page">
          <span className="flex h-[30px] w-[56px] items-center justify-center rounded-full bg-oc-tint">
            <CalendarDays size={22} strokeWidth={2.1} />
          </span>
          Naptár
        </span>
        <Link href="/drivers" className={`${item} text-oc-muted`}>
          <span className="flex h-[30px] w-[56px] items-center justify-center rounded-full">
            <Users size={22} strokeWidth={1.8} />
          </span>
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
      {open && <div className="oc-fade-in absolute inset-0 z-20 bg-[#0b1220]/35 backdrop-blur-[2px]" onClick={() => setOpen(false)} aria-hidden />}
      <div className="absolute right-4 bottom-4 z-30 flex flex-col items-end gap-3">
        {open && (
          <>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onNewEvent();
              }}
              className="oc-pop-in oc-shadow-pop flex h-11 items-center gap-2 rounded-full bg-white pr-4 pl-3 text-[14.5px] font-semibold text-oc-ink active:scale-95 transition-transform"
            >
              <CalendarPlus size={19} className="text-oc-blue" /> Szabadság / esemény
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onNewBooking();
              }}
              className="oc-pop-in oc-shadow-pop flex h-11 items-center gap-2 rounded-full bg-white pr-4 pl-3 text-[14.5px] font-semibold text-oc-ink active:scale-95 transition-transform"
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
          className="oc-shadow-fab oc-fab-grad flex h-[58px] w-[58px] items-center justify-center rounded-[20px] text-white transition-transform duration-200 active:scale-90"
        >
          <Plus size={27} strokeWidth={2.2} className={`transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${open ? "rotate-[135deg]" : ""}`} />
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
        className="oc-snack-in pointer-events-auto flex max-w-[460px] items-center gap-3 rounded-[14px] bg-[#1b1f2a]/95 backdrop-blur-md py-2.5 pr-2 pl-4 text-[14px] leading-[20px] text-white shadow-lg"
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
      <div className="oc-safe-top oc-appbar text-white">
        <div className="flex h-[58px] items-center px-4 text-[22px] font-semibold">Naptár</div>
        <div className="h-[38px]" />
      </div>
      <div className="h-[66px] rounded-b-[18px] bg-white oc-shadow-strip" />
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
