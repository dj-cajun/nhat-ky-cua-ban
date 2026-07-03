import { useMemo, useState } from 'react';
import { assertCleanText } from '@/lib/profanity-shield';
import { db } from '@/lib/db';
import {
  getTodayVN,
  getVNWeekFromSunday,
  isSameVNDate,
  toDateKey,
  type VNDate,
} from '@/lib/vn-calendar';
import { MAX_DIARY_CHARS } from '@/types';
import { vi } from '@/i18n/vi';

function displayMemo(content: string | undefined): string {
  const text = content?.trim() ?? '';
  if (!text) return '·';
  return text.length > MAX_DIARY_CHARS ? `${text.slice(0, MAX_DIARY_CHARS)}…` : text;
}

export function CalendarWidget() {
  const today = useMemo(() => getTodayVN(), []);
  const weekDates = useMemo(() => getVNWeekFromSunday(today), [today]);
  const [entries, setEntries] = useState(db.getCalendar());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');

  const headerLabel = `${today.year}.${today.month}`;

  const openModal = (date: VNDate) => {
    const dateStr = toDateKey(date);
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

    db.saveCalendar(selectedDate, draft.trim());
    setEntries(db.getCalendar());
    setSelectedDate(null);
    setDraft('');
  };

  return (
    <>
      <div className="cy-card flex h-full flex-col p-1.5">
        <div className="mb-0.5 shrink-0 font-mono text-[10px] font-bold leading-tight">
          <div>{headerLabel}</div>
          <div className="text-[8px] font-normal text-zinc-500">CN → T7</div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {weekDates.map((date, index) => {
            const dateStr = toDateKey(date);
            const entry = entries.find((e) => e.date === dateStr);
            const isToday = isSameVNDate(date, today);
            const dayLabel = vi.calendarDays[index];

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => openModal(date)}
                className="flex min-h-0 flex-1 items-center gap-0.5 border-b border-zinc-200/80 py-px text-left last:border-b-0"
              >
                <span className="w-4 shrink-0 text-center font-mono text-[7px] font-bold text-zinc-400">
                  {dayLabel}
                </span>
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center font-mono text-[9px] font-bold leading-none ${
                    isToday ? 'cy-today rounded-sm' : 'text-zinc-800'
                  }`}
                >
                  {date.day}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-[8px] leading-tight text-zinc-600">
                  {displayMemo(entry?.content)}
                </span>
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
