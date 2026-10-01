"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, RefreshCw, Search, WifiOff } from "lucide-react";
import {
  addDays,
  addMonths,
  HU_MONTHS,
  isSameDay,
  monthYearTitle,
  longDate,
  parseYmd,
  startOfDay,
  weekRow,
  ymd,
} from "@/lib/calendar/dates";
import { applyFilters, groupByDate } from "@/lib/calendar/mapping";
import { DEFAULT_FILTERS, type CalEvent, type CalendarFilters, type CalendarViewId, type CustomEventDTO } from "@/lib/calendar/types";
import AgendaView from "./AgendaView";
import { AccountMenu, AppBar, BottomNav, CalendarSkeleton, Fab, Snackbar, ViewMenu, VIEW_LABELS, type ToastData } from "./Chrome";
import Drawer, { FiltersPanel, filtersActive, initials, type UserInfo } from "./Drawer";
import EventForm from "./EventForm";
import EventSheet from "./EventSheet";
import { datesWithEvents, useCalendarData, useMediaQuery, useNow, useStoredState } from "./hooks";
import MiniMonth from "./MiniMonth";
import MonthView from "./MonthView";
import SearchPanel from "./SearchPanel";
import { loadStaff, type StaffDriver } from "./staff";
import TimelineView from "./TimelineView";
import WeekStrip, { WeekdayRow } from "./WeekStrip";

const MOBILE_VIEWS: CalendarViewId[] = ["agenda", "day", "threeDay", "month"];
const DESKTOP_VIEWS: CalendarViewId[] = ["day", "threeDay", "week", "month", "agenda"];

function rangeTitle(days: Date[]): string {
  const first = days[0];
  const last = days[days.length - 1];
  if (days.length === 1) return longDate(first);
  const short = (d: Date) => `${HU_MONTHS[d.getMonth()].slice(0, 3)}. ${d.getDate()}.`;
  if (first.getMonth() === last.getMonth()) {
    return `${first.getFullYear()}. ${HU_MONTHS[first.getMonth()]} ${first.getDate()}–${last.getDate()}.`;
  }
  return `${short(first)} – ${short(last)}`;
}

export default function CalendarApp({ user }: { user: UserInfo }) {
  const router = useRouter();
  const now = useNow();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [viewPref, setViewPref] = useStoredState<CalendarViewId | null>("oc:view", null);
  const [filters, setFilters] = useStoredState<CalendarFilters>("oc:filters", DEFAULT_FILTERS);

  // Server output is the skeleton (now === null), so a client-only initial date never mismatches.
  const [selected, setSelected] = useState<Date>(() => startOfDay(new Date()));
  const [pinned, setPinned] = useState(() => ymd(startOfDay(new Date())));
  const [scrollTarget, setScrollTarget] = useState(() => ({ date: ymd(startOfDay(new Date())), nonce: 1 }));

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [openEvent, setOpenEvent] = useState<CalEvent | null>(null);
  const [form, setForm] = useState<{ open: boolean; editing: CustomEventDTO | null; date: string | null }>({
    open: false,
    editing: null,
    date: null,
  });
  const [toast, setToast] = useState<ToastData | null>(null);
  const [drivers, setDrivers] = useState<StaffDriver[]>([]);
  const toastId = useRef(0);

  const data = useCalendarData(selected);
  const { ensureRange } = data;

  const filtered = useMemo(() => applyFilters(data.events, filters), [data.events, filters]);
  const byDate = useMemo(() => groupByDate(filtered), [filtered]);
  const eventDates = useMemo(() => datesWithEvents(filtered), [filtered]);

  const allowedViews = isDesktop ? DESKTOP_VIEWS : MOBILE_VIEWS;
  const view: CalendarViewId = viewPref && allowedViews.includes(viewPref) ? viewPref : isDesktop ? "week" : "agenda";

  const showToast = useCallback((text: string, action?: { label: string; run: () => void }) => {
    toastId.current += 1;
    setToast({ id: toastId.current, text, actionLabel: action?.label, onAction: action?.run });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);

  const selectDate = useCallback((date: Date) => {
    const day = startOfDay(date);
    setSelected(day);
    setPinned(ymd(day));
    setScrollTarget((t) => ({ date: ymd(day), nonce: t.nonce + 1 }));
  }, []);

  const onVisibleDate = useCallback((day: string) => setSelected(parseYmd(day)), []);

  const changeView = useCallback(
    (next: CalendarViewId) => {
      setViewPref(next);
      setPinned(ymd(selected));
      setScrollTarget((t) => ({ date: ymd(selected), nonce: t.nonce + 1 }));
    },
    [selected, setViewPref]
  );

  useEffect(() => {
    ensureRange(ymd(addDays(selected, -21)), ymd(addDays(selected, 60)));
  }, [selected, data.range, ensureRange]);

  useEffect(() => {
    if (isDesktop) loadStaff().then((lists) => setDrivers(lists.drivers));
  }, [isDesktop]);

  const needMore = useCallback(
    (direction: "past" | "future") => {
      const range = data.range;
      if (!range) return;
      if (direction === "past") ensureRange(ymd(addDays(parseYmd(range.from), -1)), range.to);
      else ensureRange(range.from, ymd(addDays(parseYmd(range.to), 1)));
    },
    [data.range, ensureRange]
  );

  const openFromSearch = useCallback(
    (event: CalEvent) => {
      setSearchOpen(false);
      selectDate(parseYmd(event.date));
      setOpenEvent(event);
    },
    [selectDate]
  );

  const { newBookings, dismissNewBookings } = data;
  useEffect(() => {
    if (newBookings.length === 0) return;
    const latest = newBookings[0];
    const text =
      newBookings.length === 1 ? `Új foglalás érkezett: ${latest.travelerName || latest.code}` : `${newBookings.length} új foglalás érkezett`;
    showToast(text, {
      label: "Megnyitás",
      run: () => selectDate(parseYmd(latest.pickupDate)),
    });
    dismissNewBookings();
  }, [newBookings, dismissNewBookings, showToast, selectDate]);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }, [router]);

  const goNewBooking = useCallback(() => router.push("/bookings/new"), [router]);
  const openNewEvent = useCallback(() => setForm({ open: true, editing: null, date: null }), []);
  const openNewEventOn = useCallback((date: string) => setForm({ open: true, editing: null, date }), []);
  const closeForm = useCallback(() => setForm((f) => ({ ...f, open: false })), []);
  const closeEvent = useCallback(() => setOpenEvent(null), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const closeViewMenu = useCallback(() => setViewMenuOpen(false), []);
  const closeAccount = useCallback(() => setAccountOpen(false), []);

  if (now === null) return <CalendarSkeleton />;

  const today = startOfDay(new Date(now));
  const isTodaySelected = isSameDay(selected, today);
  const title =
    HU_MONTHS[selected.getMonth()] + (selected.getFullYear() !== today.getFullYear() ? ` ${selected.getFullYear()}` : "");

  const timelineDays =
    view === "day" ? [selected] : view === "threeDay" ? [0, 1, 2].map((i) => addDays(selected, i)) : weekRow(selected);

  const stepBy = (dir: 1 | -1) => {
    if (view === "month") selectDate(addMonths(selected, dir));
    else if (view === "week" || view === "agenda") selectDate(addDays(selected, 7 * dir));
    else selectDate(addDays(selected, (view === "threeDay" ? 3 : 1) * dir));
  };

  const content = (() => {
    if (view === "agenda" || (view === "month" && !isDesktop)) {
      return (
        <AgendaView
          eventsByDate={byDate}
          pinnedDate={pinned}
          now={now}
          scrollTarget={scrollTarget}
          onVisibleDate={onVisibleDate}
          onOpen={setOpenEvent}
          onNeedMore={needMore}
          onAddOnDay={openNewEventOn}
          range={data.range}
          singleDay={view === "month"}
          loading={data.loading}
        />
      );
    }
    if (view === "month") {
      return (
        <MonthView
          anchor={selected}
          today={today}
          eventsByDate={byDate}
          onOpen={setOpenEvent}
          onSelectDay={selectDate}
          onOpenDay={(d) => {
            selectDate(d);
            changeView("day");
          }}
        />
      );
    }
    return (
      <TimelineView
        days={timelineDays}
        eventsByDate={byDate}
        now={now}
        selected={selected}
        showHeader={isDesktop || view === "threeDay"}
        hourPx={isDesktop ? 60 : 56}
        scrollKey={`${view}:${isDesktop}`}
        onOpen={setOpenEvent}
        onSelectDay={selectDate}
        onPage={isDesktop ? undefined : (dir) => selectDate(addDays(selected, dir * (view === "threeDay" ? 3 : 1)))}
      />
    );
  })();

  const errorBanner = data.error && (
    <div className="flex shrink-0 items-center gap-2 bg-[#FFF4CE] px-3 py-2 text-[13px] text-[#6B5200]" role="alert">
      <WifiOff size={16} />
      <span className="min-w-0 flex-1 truncate">{data.error}</span>
      <button type="button" onClick={() => void data.refresh()} className="font-medium text-oc-blue">
        Újra
      </button>
    </div>
  );

  const overlays = (
    <>
      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        user={user}
        pendingCount={data.pendingCount}
        filters={filters}
        onFilters={setFilters}
        onLogout={logout}
        onNewBooking={goNewBooking}
      />
      <SearchPanel open={searchOpen} onClose={closeSearch} onPick={openFromSearch} />
      <ViewMenu open={viewMenuOpen} onClose={closeViewMenu} view={view} views={allowedViews} onPick={changeView} />
      <AccountMenu open={accountOpen} onClose={closeAccount} user={user} onLogout={logout} />
      <EventSheet
        event={openEvent}
        onClose={closeEvent}
        onChanged={data.refresh}
        onToast={showToast}
        onEditCustom={(dto) => setForm({ open: true, editing: dto, date: null })}
      />
      <EventForm
        open={form.open}
        editing={form.editing}
        defaultDate={form.date ?? ymd(selected)}
        onClose={closeForm}
        onSaved={async (message) => {
          await data.refresh();
          showToast(message);
        }}
      />
    </>
  );

  if (!isDesktop) {
    return (
      <div className="oc-root flex h-dvh flex-col overflow-hidden bg-[#fbfbfd]">
        <header className="oc-safe-top oc-appbar shrink-0 text-white">
          <AppBar
            title={title}
            view={view}
            user={user}
            filterActive={filtersActive(filters)}
            todayNumber={today.getDate()}
            onToday={isTodaySelected ? undefined : () => selectDate(today)}
            onMenu={() => setDrawerOpen(true)}
            onView={() => setViewMenuOpen(true)}
            onSearch={() => setSearchOpen(true)}
            onAccount={() => setAccountOpen(true)}
          />
          <WeekdayRow />
        </header>
        <WeekStrip
          selected={selected}
          today={today}
          eventDates={eventDates}
          onSelect={selectDate}
          forceExpanded={view === "month"}
        />
        <main className="relative flex min-h-0 flex-1 flex-col">
          {errorBanner}
          <div className="relative min-h-0 flex-1">{content}</div>
          <Fab onNewBooking={goNewBooking} onNewEvent={openNewEvent} />
          <Snackbar toast={toast} onDismiss={dismissToast} />
        </main>
        <BottomNav pendingCount={data.pendingCount} />
        {overlays}
      </div>
    );
  }

  return (
    <div className="oc-root flex h-dvh flex-col overflow-hidden bg-white">
      <header className="oc-appbar flex h-[52px] shrink-0 items-center gap-4 px-4 text-white">
        <div className="flex items-center gap-2.5">
          <CalendarDays size={22} />
          <span className="text-[17px] font-medium whitespace-nowrap">Pannon Transfer · Naptár</span>
        </div>
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="mx-auto flex h-9 w-full max-w-[520px] items-center gap-2 rounded-[6px] bg-white/20 px-3 text-left text-[14px] text-white/85 hover:bg-white/28"
        >
          <Search size={17} /> Keresés az utak között…
        </button>
        <nav className="flex items-center gap-1 text-[14px]">
          <Link href="/bookings" className="relative flex h-9 items-center rounded-[6px] px-3 hover:bg-white/15">
            Foglalások
            {data.pendingCount > 0 && (
              <span className="ml-1.5 rounded-full bg-[#D13438] px-1.5 text-[11px] leading-[16px] font-semibold">{data.pendingCount}</span>
            )}
          </Link>
          <Link href="/drivers" className="flex h-9 items-center rounded-[6px] px-3 hover:bg-white/15">
            Sofőrök
          </Link>
          <Link href="/vehicles" className="flex h-9 items-center rounded-[6px] px-3 hover:bg-white/15">
            Járművek
          </Link>
        </nav>
        <button
          type="button"
          onClick={() => setAccountOpen(true)}
          aria-label="Fiók"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/25 text-[12px] font-medium hover:bg-white/35"
        >
          {initials(user.name)}
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="oc-scroll flex w-[272px] shrink-0 flex-col gap-5 overflow-y-auto border-r border-oc-line p-4">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={openNewEvent}
              className="flex h-10 items-center justify-center gap-2 rounded-full bg-oc-blue text-[14px] font-medium text-white hover:bg-oc-blue-dark"
            >
              <Plus size={18} /> Új esemény
            </button>
            <button
              type="button"
              onClick={goNewBooking}
              className="flex h-10 items-center justify-center gap-2 rounded-full border border-oc-line text-[14px] font-medium text-oc-ink hover:bg-oc-surface"
            >
              Új foglalás
            </button>
          </div>
          <MiniMonth selected={selected} today={today} eventDates={eventDates} onSelect={selectDate} />
          <FiltersPanel filters={filters} onFilters={setFilters} drivers={drivers} />
        </aside>

        <section className="relative flex min-w-0 flex-1 flex-col">
          <div className="flex h-[52px] shrink-0 items-center gap-2 border-b border-oc-line px-4">
            <button
              type="button"
              onClick={() => selectDate(today)}
              className="h-9 rounded-[6px] border border-oc-line px-4 text-[14px] font-medium text-oc-ink hover:bg-oc-surface"
            >
              Ma
            </button>
            <button type="button" aria-label="Előző" onClick={() => stepBy(-1)} className="flex h-9 w-9 items-center justify-center rounded-full text-oc-muted hover:bg-oc-surface">
              <ChevronLeft size={20} />
            </button>
            <button type="button" aria-label="Következő" onClick={() => stepBy(1)} className="flex h-9 w-9 items-center justify-center rounded-full text-oc-muted hover:bg-oc-surface">
              <ChevronRight size={20} />
            </button>
            <h1 className="ml-1 min-w-0 flex-1 truncate text-[18px] font-semibold text-oc-ink">
              {view === "month" || view === "agenda" ? monthYearTitle(selected) : rangeTitle(timelineDays)}
            </h1>
            <button
              type="button"
              onClick={() => void data.refresh()}
              aria-label="Frissítés"
              className="flex h-9 w-9 items-center justify-center rounded-full text-oc-muted hover:bg-oc-surface"
            >
              <RefreshCw size={17} className={data.loading ? "animate-spin" : ""} />
            </button>
            <div className="flex rounded-[8px] border border-oc-line p-0.5" role="tablist" aria-label="Nézet">
              {DESKTOP_VIEWS.map((id) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={view === id}
                  onClick={() => changeView(id)}
                  className={`h-8 rounded-[6px] px-3 text-[13px] font-medium transition-colors ${
                    view === id ? "bg-oc-tint text-oc-blue-dark" : "text-oc-muted hover:bg-oc-surface"
                  }`}
                >
                  {VIEW_LABELS[id]}
                </button>
              ))}
            </div>
          </div>
          {errorBanner}
          <div className="relative min-h-0 flex-1">
            {view === "agenda" ? <div className="mx-auto h-full max-w-[760px]">{content}</div> : content}
          </div>
          <Snackbar toast={toast} onDismiss={dismissToast} />
        </section>
      </div>
      {overlays}
    </div>
  );
}
