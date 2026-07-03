import { useMemo, useState } from 'react';
import { db } from '@/lib/db';
import { playSynth } from '@/lib/synth';
import { verifyTextCleanStatus } from '@/lib/verify-live-filter';
import {
  getTodayVN,
  getVNWeekFromSunday,
  isSameVNDate,
  toDateKey,
  type VNDate,
} from '@/lib/vn-calendar';
import { MAX_CALENDAR_CHARS } from '@/types';
import { vi } from '@/i18n/vi';

function displayMemo(content: string | undefined): string {
  const text = content?.trim() ?? '';
  if (!text) return '·';
  return text.length > MAX_CALENDAR_CHARS ? `${text.slice(0, MAX_CALENDAR_CHARS)}…` : text;
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
    const text = draft.trim();

    if (text.length > MAX_CALENDAR_CHARS) {
      playSynth(150, 0.25, 'sawtooth');
      setError(vi.doodle.calendarTooLong);
      return;
    }

    if (text && !verifyTextCleanStatus(text)) {
      playSynth(150, 0.35, 'sawtooth');
      setError(vi.doodle.calendarProfanity);
      return;
    }

    if (!selectedDate) return;

    db.saveCalendar(selectedDate, text);
    setEntries(db.getCalendar());
    setSelectedDate(null);
    setDraft('');
    setError('');
  };

  return (
    <>
      <div className="cy-card flex h-full flex-col bg-[#fffdfa] p-1.5">
        <div className="mb-0.5 shrink-0 text-[10px] font-extrabold leading-tight text-[#2e2a25]">
          <div>{headerLabel}</div>
          <div className="text-[8px] font-bold text-zinc-500">CN → T7</div>
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
                className="flex min-h-0 flex-1 items-center gap-0.5 border-b border-[#2e2a25]/10 py-px text-left last:border-b-0"
              >
                <span className="w-4 shrink-0 text-center text-[7px] font-extrabold text-zinc-400">
                  {dayLabel}
                </span>
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center text-[9px] font-extrabold leading-none ${
                    isToday ? 'rounded-sm bg-[#ffc6ff] text-[#2e2a25]' : 'text-zinc-800'
                  }`}
                >
                  {date.day}
                </span>
                <span className="min-w-0 flex-1 truncate text-[8px] font-bold leading-tight text-zinc-600">
                  {displayMemo(entry?.content)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#2e2a25]/40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center">
          <div className="cy-card w-full max-w-xs bg-[#fffef0] p-4">
            <h3 className="mb-2 text-sm font-extrabold">{vi.home.calendarTitle(selectedDate)}</h3>
            <p className="mb-2 text-xs font-bold text-zinc-500">
              {vi.home.maxChars(MAX_CALENDAR_CHARS)}
            </p>
            <input
              type="text"
              value={draft}
              maxLength={MAX_CALENDAR_CHARS}
              onChange={(e) => {
                setDraft(e.target.value);
                setError('');
              }}
              className="cy-card-inset mb-2 w-full rounded-lg px-2 py-2 text-center text-sm font-bold"
              placeholder={vi.home.calendarPlaceholder}
            />
            <p className="mb-2 text-right text-xs font-bold text-zinc-500">
              {draft.length}/{MAX_CALENDAR_CHARS}
            </p>
            {error && <p className="mb-2 text-xs font-extrabold text-red-600">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="cy-hard-btn min-h-[44px] flex-1 rounded-xl bg-white py-2 text-sm"
              >
                {vi.home.cancel}
              </button>
              <button
                type="button"
                onClick={saveEntry}
                className="cy-write-btn min-h-[44px] flex-1 rounded-xl py-2 text-sm"
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
