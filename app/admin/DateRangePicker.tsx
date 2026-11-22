"use client";

import { useEffect, useRef, useState } from "react";
import { formatTrainingRange } from "../certificates/settings";

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const WEEKDAYS = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"];
const WEEKDAY_NAMES = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

type Month = { y: number; m: number };

function iso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parse(value: string): Month & { d: number } {
  const [y, m, d] = value.split("-").map(Number);
  return { y, m: m - 1, d };
}

function today() {
  const now = new Date();
  return iso(now.getFullYear(), now.getMonth(), now.getDate());
}

function addMonths({ y, m }: Month, delta: number): Month {
  const date = new Date(y, m + delta, 1);
  return { y: date.getFullYear(), m: date.getMonth() };
}

/** Day cells of a month, Monday first; null for the leading blanks. */
function monthCells({ y, m }: Month) {
  const offset = (new Date(y, m, 1).getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  return [...Array<null>(offset).fill(null), ...Array.from({ length: days }, (_, index) => iso(y, m, index + 1))];
}

function dayCount(start: string, end: string) {
  const a = parse(start); const b = parse(end);
  return Math.round((Date.UTC(b.y, b.m, b.d) - Date.UTC(a.y, a.m, a.d)) / 86_400_000) + 1;
}

/** Hotel-style range picker: click the first day, then the last day. */
export default function DateRangePicker({ start, end, onChange }: { start: string; end: string; onChange: (start: string, end: string) => void }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Month>(() => parse(start || today()));
  const [draft, setDraft] = useState("");
  const [hover, setHover] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const todayValue = today();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [open]);

  function toggle() {
    if (open) { setOpen(false); return; }
    setDraft(""); setHover("");
    setView(parse(start || today()));
    setOpen(true);
  }

  function pick(day: string) {
    if (!draft || day < draft) { setDraft(day); setHover(day); return; }
    onChange(draft, day);
    setDraft("");
    setOpen(false);
  }

  const shownStart = draft || start;
  const shownEnd = draft ? (hover && hover >= draft ? hover : draft) : end || start;
  const label = formatTrainingRange(start, end)?.tr;

  return (
    <div className="drp" ref={rootRef}>
      <div className="drp-field">
        <button type="button" className={`drp-trigger${label ? "" : " is-empty"}`} onClick={toggle} aria-haspopup="dialog" aria-expanded={open}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18" /></svg>
          <span>{label ? `${label} · ${dayCount(start, end || start)} gün` : "Takvimden tarih aralığı seçin"}</span>
        </button>
        {label && <button type="button" className="drp-clear" onClick={() => onChange("", "")} aria-label="Tarih aralığını temizle">×</button>}
      </div>

      {open && (
        <div className="drp-popover" role="dialog" aria-label="Eğitim tarih aralığı">
          <div className="drp-head">
            <button type="button" onClick={() => setView(addMonths(view, -1))} aria-label="Önceki ay">‹</button>
            <span>{draft ? "Şimdi bitiş gününü seçin" : "Başlangıç gününü seçin"}</span>
            <button type="button" onClick={() => setView(addMonths(view, 1))} aria-label="Sonraki ay">›</button>
          </div>
          <div className="drp-months">
            {[view, addMonths(view, 1)].map((month, index) => (
              <div className={`drp-month${index === 1 ? " drp-month-second" : ""}`} key={`${month.y}-${month.m}`}>
                <b>{MONTHS[month.m]} {month.y}</b>
                <div className="drp-grid" onMouseLeave={() => draft && setHover(draft)}>
                  {WEEKDAYS.map((day) => <span className="drp-weekday" key={day}>{day}</span>)}
                  {monthCells(month).map((day, cell) => {
                    if (!day) return <span key={`blank-${cell}`} />;
                    const { d } = parse(day);
                    const weekday = (new Date(month.y, month.m, d).getDay() + 6) % 7;
                    const isStart = day === shownStart; const isEnd = day === shownEnd;
                    const inRange = Boolean(shownStart && shownEnd && day > shownStart && day < shownEnd);
                    const className = ["drp-day", isStart && "is-start", isEnd && "is-end", inRange && "in-range", isStart && isEnd && "is-single", day === todayValue && "is-today", weekday >= 5 && "is-weekend"].filter(Boolean).join(" ");
                    return (
                      <button type="button" key={day} className={className} onClick={() => pick(day)} onMouseEnter={() => draft && setHover(day)} onFocus={() => draft && setHover(day)}
                        aria-pressed={isStart || isEnd || inRange} aria-label={`${d} ${MONTHS[month.m]} ${month.y} ${WEEKDAY_NAMES[weekday]}`}>
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="drp-foot">
            <span>{draft ? `${formatTrainingRange(draft, shownEnd)?.tr} · ${dayCount(draft, shownEnd)} gün` : label ? `Seçili: ${label}` : "Tek günlük eğitim için aynı güne iki kez tıklayın."}</span>
            <button type="button" onClick={() => setOpen(false)}>Kapat</button>
          </div>
        </div>
      )}
    </div>
  );
}
