"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "./primitives";

function toDate(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toValue(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function displayValue(value: string) {
  const date = toDate(value);
  return date ? `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}` : "";
}

function sameDay(first: Date | null, second: Date) {
  return Boolean(first && first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth() && first.getDate() === second.getDate());
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export default function PremiumDatePicker({
  id,
  value,
  onChange,
  maxDate = new Date(),
  required = false,
  label = "Date of birth",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  maxDate?: Date;
  required?: boolean;
  label: string;
}) {
  const selectedDate = toDate(value);
  const today = startOfDay(maxDate);
  const [open, setOpen] = useState(false);
  const [calendarView, setCalendarView] = useState<"days" | "months" | "years">("days");
  const [typedValue, setTypedValue] = useState(() => displayValue(value));
  const [visibleMonth, setVisibleMonth] = useState(() => selectedDate ?? today);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setTypedValue(displayValue(value)), 0);
    return () => window.clearTimeout(timer);
  }, [value]);

  const days = useMemo(() => {
    const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const offset = first.getDay();
    const total = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
    const previousTotal = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 0).getDate();
    return Array.from({ length: 42 }, (_, index) => {
      const dayNumber = index - offset + 1;
      if (dayNumber < 1) return new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, previousTotal + dayNumber);
      if (dayNumber > total) return new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, dayNumber - total);
      return new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), dayNumber);
    });
  }, [visibleMonth]);

  const monthLabel = visibleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  function choose(day: Date) {
    if (day > today) return;
    onChange(toValue(day));
    setTypedValue(displayValue(toValue(day)));
    setOpen(false);
    setCalendarView("days");
  }

  function shiftMonth(amount: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  }

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" id={id} name={id} value={value} required={required} />
      <div className="premium-date-input flex h-12 w-full min-w-0 items-center gap-2 rounded-xl border border-border bg-white/90 px-3.75 text-[0.9375rem] text-ink shadow-[0_1px_2px_rgba(15,23,42,0.02),inset_0_1px_0_rgba(255,255,255,0.8)] transition hover:border-brand/50 hover:bg-white focus-within:border-brand focus-within:bg-white focus-within:ring-4 focus-within:ring-brand/10">
        <input
          id={`${id}-text`}
          type="text"
          inputMode="numeric"
          autoComplete="bday"
          placeholder="MM/DD/YYYY"
          value={typedValue}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "").slice(0, 8);
            const formatted = digits.length > 4 ? `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}` : digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
            setTypedValue(formatted);
            if (digits.length === 8) {
              const month = Number(digits.slice(0, 2));
              const day = Number(digits.slice(2, 4));
              const year = Number(digits.slice(4));
              const candidate = new Date(year, month - 1, day);
              if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && candidate.getMonth() === month - 1 && candidate.getDate() === day && candidate <= today) {
                onChange(toValue(candidate));
              }
            }
          }}
          onFocus={() => setOpen(false)}
          className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-ink outline-none placeholder:text-ink-faint"
          aria-label={`${label}, type month day and year`}
        />
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`Open ${label} calendar`}
          onClick={() => setOpen((current) => !current)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand transition hover:bg-brand/15"
        >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M7 2.8v3.4M17 2.8v3.4M3 9h18" /></svg>
        </span>
        </button>
      </div>

      {open && (
        <div role="dialog" aria-label={label} className="absolute left-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2.5rem))] overflow-hidden rounded-2xl border border-[#d8e2d3] bg-white p-4 shadow-[0_24px_55px_rgba(24,38,25,0.18)] ring-1 ring-black/5">
          <div className="flex items-center justify-between gap-3">
            <button type="button" onClick={() => setCalendarView((current) => current === "days" ? "months" : "days")} className="rounded-lg px-2 py-1 font-display text-lg font-semibold text-ink transition hover:bg-brand-tint hover:text-brand-dark" aria-label="Choose month and year">{monthLabel} <span className="ml-1 font-sans text-xs text-brand">{calendarView === "days" ? "▾" : "▴"}</span></button>
            <div className="flex gap-1">
              {calendarView === "days" ? <><button type="button" onClick={() => shiftMonth(-1)} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-brand-tint hover:text-brand-dark" aria-label="Previous month">‹</button><button type="button" onClick={() => shiftMonth(1)} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition hover:bg-brand-tint hover:text-brand-dark" aria-label="Next month">›</button></> : <button type="button" onClick={() => setCalendarView("years")} className="rounded-lg px-2 py-1 text-xs font-semibold text-brand transition hover:bg-brand-tint">Choose year</button>}
            </div>
          </div>
          {calendarView === "days" ? <>
            <div className="mt-4 grid grid-cols-7 gap-1 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => <span key={day} className="py-1">{day}</span>)}</div>
            <div className="mt-1 grid grid-cols-7 gap-1">{days.map((day) => { const outside = day.getMonth() !== visibleMonth.getMonth(); const disabled = day > today; return <button key={toValue(day)} type="button" disabled={disabled} onClick={() => choose(day)} className={cn("flex aspect-square items-center justify-center rounded-lg text-sm transition", outside ? "text-ink-faint/35" : "text-ink-secondary", disabled && "cursor-not-allowed text-ink-faint/25", sameDay(selectedDate, day) && "bg-brand font-semibold text-brand-foreground shadow-sm", !disabled && !sameDay(selectedDate, day) && "hover:bg-brand-tint hover:text-brand-dark")}>{day.getDate()}</button>; })}</div>
          </> : calendarView === "months" ? <div className="mt-5 grid grid-cols-3 gap-2">{Array.from({ length: 12 }, (_, month) => { const candidate = new Date(visibleMonth.getFullYear(), month, 1); const disabled = new Date(candidate.getFullYear(), month, 1) > new Date(today.getFullYear(), today.getMonth(), 1); return <button key={month} type="button" disabled={disabled} onClick={() => { setVisibleMonth(candidate); setCalendarView("days"); }} className={cn("rounded-xl px-2 py-3 text-sm font-semibold transition", month === visibleMonth.getMonth() ? "bg-brand text-brand-foreground" : "text-ink-secondary hover:bg-brand-tint hover:text-brand-dark", disabled && "cursor-not-allowed text-ink-faint/30")}>{candidate.toLocaleDateString("en-US", { month: "short" })}</button>; })}</div> : <div className="mt-5 grid max-h-56 grid-cols-3 gap-2 overflow-y-auto pr-1">{Array.from({ length: 121 }, (_, index) => today.getFullYear() - index).map((year) => { const disabled = year > today.getFullYear(); return <button key={year} type="button" disabled={disabled} onClick={() => { setVisibleMonth(new Date(year, visibleMonth.getMonth(), 1)); setCalendarView("months"); }} className={cn("rounded-xl px-2 py-2.5 text-sm font-semibold transition", year === visibleMonth.getFullYear() ? "bg-brand text-brand-foreground" : "text-ink-secondary hover:bg-brand-tint hover:text-brand-dark", disabled && "cursor-not-allowed text-ink-faint/30")}>{year}</button>; })}</div>}
          <div className="mt-3 flex items-center justify-between border-t border-border-soft pt-3 text-xs font-semibold">
            <button type="button" onClick={() => { onChange(""); setTypedValue(""); setOpen(false); }} className="text-ink-muted transition hover:text-brand-dark">Clear</button>
            <button type="button" onClick={() => choose(today)} className="text-brand transition hover:text-brand-dark">Today</button>
          </div>
        </div>
      )}
    </div>
  );
}
