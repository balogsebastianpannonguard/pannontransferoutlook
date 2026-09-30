"use client";

import { useEffect, useState } from "react";
import { Check, TreePalm, CalendarPlus } from "lucide-react";
import { TONES, TONE_IDS } from "@/lib/calendar/tones";
import type { CustomEventDTO, CustomEventKind, ToneId } from "@/lib/calendar/types";
import Sheet from "./Sheet";
import { loadStaff, type StaffDriver } from "./staff";

interface Props {
  open: boolean;
  /** Existing event when editing, otherwise the default date for a new one. */
  editing: CustomEventDTO | null;
  defaultDate: string;
  onClose: () => void;
  onSaved: (message: string) => void | Promise<void>;
}

interface FormState {
  title: string;
  kind: CustomEventKind;
  allDay: boolean;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  driverName: string;
  notes: string;
  tone: ToneId;
}

function initialState(editing: CustomEventDTO | null, defaultDate: string, kind: CustomEventKind = "leave"): FormState {
  if (editing) {
    return {
      title: editing.title,
      kind: editing.kind,
      allDay: editing.allDay,
      startDate: editing.startDate,
      endDate: editing.endDate,
      startTime: editing.startTime ?? "09:00",
      endTime: editing.endTime ?? "10:00",
      driverName: editing.driverName ?? "",
      notes: editing.notes ?? "",
      tone: editing.tone ?? (editing.kind === "leave" ? "green" : "sky"),
    };
  }
  return {
    title: "",
    kind,
    allDay: kind === "leave",
    startDate: defaultDate,
    endDate: defaultDate,
    startTime: "09:00",
    endTime: "10:00",
    driverName: "",
    notes: "",
    tone: kind === "leave" ? "green" : "sky",
  };
}

const fieldClass =
  "h-11 w-full rounded-[8px] border border-oc-line bg-white px-3 text-[15px] text-oc-ink outline-none focus:border-oc-blue focus:ring-2 focus:ring-oc-blue/20";

export default function EventForm({ open, editing, defaultDate, onClose, onSaved }: Props) {
  return (
    <Sheet open={open} onClose={onClose} label={editing ? "Esemény szerkesztése" : "Új esemény"} tall>
      <FormBody key={editing?.id ?? defaultDate} editing={editing} defaultDate={defaultDate} onClose={onClose} onSaved={onSaved} />
    </Sheet>
  );
}

function FormBody({ editing, defaultDate, onClose, onSaved }: Omit<Props, "open">) {
  const [form, setForm] = useState<FormState>(() => initialState(editing, defaultDate));
  const [drivers, setDrivers] = useState<StaffDriver[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadStaff().then((lists) => alive && setDrivers(lists.drivers));
    return () => {
      alive = false;
    };
  }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  function changeKind(kind: CustomEventKind) {
    setForm((f) => ({
      ...f,
      kind,
      allDay: kind === "leave" ? true : f.allDay,
      tone: f.tone === (f.kind === "leave" ? "green" : "sky") ? (kind === "leave" ? "green" : "sky") : f.tone,
    }));
  }

  async function save() {
    if (!form.title.trim()) {
      setError("Adj meg egy címet.");
      return;
    }
    if (form.endDate < form.startDate) {
      setError("A vége nem lehet korábbi a kezdésnél.");
      return;
    }
    if (!form.allDay && form.endDate === form.startDate && form.endTime && form.endTime <= form.startTime) {
      setError("A befejezés időpontja legyen a kezdés után.");
      return;
    }
    setBusy(true);
    setError(null);
    const payload = {
      title: form.title.trim(),
      kind: form.kind,
      allDay: form.allDay,
      startDate: form.startDate,
      endDate: form.endDate,
      startTime: form.allDay ? "" : form.startTime,
      endTime: form.allDay ? "" : form.endTime,
      driverName: form.driverName,
      notes: form.notes,
      tone: form.tone,
    };
    try {
      const res = await fetch(editing ? `/api/calendar-events/${editing.id}` : "/api/calendar-events", {
        method: editing ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "A mentés nem sikerült.");
      await onSaved(editing ? "Esemény frissítve" : "Esemény létrehozva");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hiba történt.");
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex shrink-0 items-center gap-2 px-4 pb-2">
        <button type="button" onClick={onClose} className="oc-ripple h-10 rounded-full px-3 text-[14px] font-medium text-oc-muted">
          Mégse
        </button>
        <h2 className="min-w-0 flex-1 truncate text-center text-[17px] font-semibold text-oc-ink">
          {editing ? "Szerkesztés" : "Új esemény"}
        </h2>
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="h-10 rounded-full bg-oc-blue px-5 text-[14px] font-medium text-white disabled:opacity-50"
        >
          {busy ? "…" : "Mentés"}
        </button>
      </div>

      <div className="oc-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pt-1 pb-6">
        <input
          autoFocus={false}
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Cím (pl. Sebi szabadság)"
          maxLength={120}
          className="h-12 w-full border-b border-oc-line bg-transparent text-[20px] font-medium text-oc-ink outline-none placeholder:text-[#A0A0A0] focus:border-oc-blue"
        />

        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["leave", "Szabadság", TreePalm],
              ["event", "Egyéb esemény", CalendarPlus],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => changeKind(id)}
              aria-pressed={form.kind === id}
              className={`flex h-11 items-center justify-center gap-2 rounded-full border text-[14px] font-medium transition-colors ${
                form.kind === id ? "border-oc-blue bg-oc-tint text-oc-blue-dark" : "border-oc-line text-oc-muted"
              }`}
            >
              <Icon size={17} /> {label}
            </button>
          ))}
        </div>

        <label className="flex items-center justify-between rounded-[8px] bg-oc-surface px-3 py-3">
          <span className="text-[15px] text-oc-ink">Egész napos</span>
          <button
            type="button"
            role="switch"
            aria-checked={form.allDay}
            onClick={() => set("allDay", !form.allDay)}
            className={`relative h-[26px] w-[46px] rounded-full transition-colors ${form.allDay ? "bg-oc-blue" : "bg-[#BDBDBD]"}`}
          >
            <span
              className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all ${form.allDay ? "left-[23px]" : "left-[3px]"}`}
            />
          </button>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-[12px] font-medium text-oc-muted">
            Kezdés
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => {
                const value = e.target.value;
                setForm((f) => ({ ...f, startDate: value, endDate: f.endDate < value ? value : f.endDate }));
              }}
              className={`${fieldClass} mt-1`}
            />
          </label>
          <label className="block text-[12px] font-medium text-oc-muted">
            Vége
            <input
              type="date"
              value={form.endDate}
              min={form.startDate}
              onChange={(e) => set("endDate", e.target.value)}
              className={`${fieldClass} mt-1`}
            />
          </label>
          {!form.allDay && (
            <>
              <label className="block text-[12px] font-medium text-oc-muted">
                Kezdő idő
                <input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} className={`${fieldClass} mt-1`} />
              </label>
              <label className="block text-[12px] font-medium text-oc-muted">
                Befejezés
                <input type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} className={`${fieldClass} mt-1`} />
              </label>
            </>
          )}
        </div>

        <label className="block text-[12px] font-medium text-oc-muted">
          Sofőr / érintett személy
          <input
            list="oc-driver-names"
            value={form.driverName}
            onChange={(e) => set("driverName", e.target.value)}
            placeholder="Nem kötelező"
            maxLength={80}
            className={`${fieldClass} mt-1`}
          />
          <datalist id="oc-driver-names">
            {drivers.map((d) => (
              <option key={d._id} value={d.name} />
            ))}
          </datalist>
        </label>

        <div>
          <div className="mb-2 text-[12px] font-medium text-oc-muted">Szín</div>
          <div className="flex flex-wrap gap-2">
            {TONE_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => set("tone", id)}
                aria-label={TONES[id].label}
                aria-pressed={form.tone === id}
                className="flex h-8 w-8 items-center justify-center rounded-full border-2"
                style={{ background: TONES[id].bg, borderColor: form.tone === id ? TONES[id].solid : TONES[id].border }}
              >
                {form.tone === id && <Check size={16} style={{ color: TONES[id].text }} strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>

        <label className="block text-[12px] font-medium text-oc-muted">
          Megjegyzés
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
            maxLength={1000}
            className="mt-1 w-full rounded-[8px] border border-oc-line bg-white px-3 py-2 text-[15px] text-oc-ink outline-none focus:border-oc-blue focus:ring-2 focus:ring-oc-blue/20"
          />
        </label>

        {error && (
          <div role="alert" className="rounded-[8px] bg-[#FDECEA] px-3 py-2 text-[13px] text-[#8C1D18]">
            {error}
          </div>
        )}
      </div>
    </>
  );
}
