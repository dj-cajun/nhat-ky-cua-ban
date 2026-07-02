import { useState } from 'react';
import { assertCleanText } from '@/lib/profanity-shield';
import { db } from '@/lib/db';
import { MAX_DIARY_CHARS } from '@/types';
import { vi } from '@/i18n/vi';

const today = new Date();
const year = today.getFullYear();
const month = today.getMonth();

function getDaysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}

function getFirstDayOfWeek(y: number, m: number): number {
  return new Date(y, m, 1).getDay();
}

export function CalendarWidget() {
  const [entries, setEntries] = useState(db.getCalendar());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const openModal = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const existing = entries.find((e) => e.date === dateStr);
    setSelectedDate(dateStr);
    setDraft(existing?.content ?? '');
    setError('');
  };

  const saveEntry = () => {
    const check = assertCleanText(draft);
    if (!check.ok) {
      setError(check.message);
      return;
    }
    if (!selectedDate) return;

    db.saveCalendar(selectedDate, draft);
    setEntries(db.getCalendar());
    setSelectedDate(null);
    setDraft('');
  };

  const cells: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <>
      <div className="cy-card flex h-full flex-col p-1.5">
        <div className="mb-0.5 font-mono text-[11px] font-bold">
          {year}.{month + 1}
        </div>
        <div className="grid flex-1 grid-cols-7 gap-px text-[9px]">
          {vi.calendarDays.map((d, i) => (
            <div key={`${d}-${i}`} className="text-center text-zinc-500">
              {d}
            </div>
          ))}
          {cells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} />;
            }
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hasEntry = entries.some((e) => e.date === dateStr);
            const isToday = day === today.getDate();

            return (
              <button
                key={day}
                type="button"
                onClick={() => openModal(day)}
                className={`flex aspect-square items-center justify-center rounded-sm border border-transparent text-[9px] ${
                  isToday ? 'cy-today' : 'bg-white'
                } ${hasEntry ? 'underline' : ''}`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center">
          <div className="cy-card w-full max-w-xs p-4">
            <h3 className="mb-2 text-sm font-bold">{vi.home.calendarTitle(selectedDate)}</h3>
            <p className="mb-2 text-xs text-zinc-500">{vi.home.maxChars(MAX_DIARY_CHARS)}</p>
            <input
              type="text"
              value={draft}
              maxLength={MAX_DIARY_CHARS}
              onChange={(e) => setDraft(e.target.value)}
              className="cy-card-inset mb-2 w-full rounded px-2 py-2 text-center text-sm"
              placeholder={vi.home.calendarPlaceholder}
            />
            <p className="mb-2 text-right text-xs text-zinc-500">
              {draft.length}/{MAX_DIARY_CHARS}
            </p>
            {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="cy-hard-btn min-h-[44px] flex-1 rounded bg-white py-2 text-sm"
              >
                {vi.home.cancel}
              </button>
              <button
                type="button"
                onClick={saveEntry}
                className="cy-write-btn min-h-[44px] flex-1 py-2 text-sm"
              >
                {vi.home.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
