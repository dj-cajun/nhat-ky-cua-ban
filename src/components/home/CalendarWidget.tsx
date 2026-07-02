import { useState } from 'react';
import { assertCleanText } from '@/lib/profanity-shield';
import { db } from '@/lib/db';
import { MAX_DIARY_CHARS } from '@/types';

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
      <div className="diary-panel flex h-full flex-col p-2">
        <div className="mb-1 flex items-center gap-1 text-xs font-bold">
          <span>📅</span>
          <span>
            {year}.{month + 1}
          </span>
        </div>
        <div className="grid flex-1 grid-cols-7 gap-0.5 text-[10px]">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={`${d}-${i}`} className="text-center text-slate-500">
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
                className={`diary-border flex aspect-square items-center justify-center rounded text-[10px] ${
                  isToday ? 'bg-amber-100 font-bold' : 'bg-white'
                } ${hasEntry ? 'underline' : ''}`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="diary-panel w-full max-w-xs p-4">
            <h3 className="mb-2 text-sm font-bold">일기 ({selectedDate})</h3>
            <p className="mb-2 text-xs text-slate-500">정확히 최대 {MAX_DIARY_CHARS}글자</p>
            <input
              type="text"
              value={draft}
              maxLength={MAX_DIARY_CHARS}
              onChange={(e) => setDraft(e.target.value)}
              className="diary-border mb-2 w-full rounded px-2 py-2 text-center text-sm"
              placeholder="오늘개빡침"
            />
            <p className="mb-2 text-right text-xs text-slate-500">
              {draft.length}/{MAX_DIARY_CHARS}
            </p>
            {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="diary-border flex-1 rounded py-2 text-sm"
              >
                취소
              </button>
              <button
                type="button"
                onClick={saveEntry}
                className="diary-border flex-1 rounded bg-slate-800 py-2 text-sm text-white"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
