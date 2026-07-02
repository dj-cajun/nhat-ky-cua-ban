import { db } from '@/lib/db';
import { getVisitorHintText } from '@/lib/visitor-hints';
import { vi } from '@/i18n/vi';

export function TodayVisitorsPanel() {
  const todayVisitors = db.getTodayVisitors();

  return (
    <div className="border-t-2 border-black bg-y2k-pink-light/30 px-3 py-2">
      <p className="mb-1.5 text-[10px] font-bold text-zinc-600">{vi.home.todayVisitorsTitle}</p>

      {todayVisitors.length === 0 ? (
        <p className="py-1 text-center text-[11px] text-zinc-500">{vi.home.todayVisitorsEmpty}</p>
      ) : (
        <ul className="max-h-28 space-y-1.5 overflow-y-auto">
          {todayVisitors.map((visitor) => (
            <li
              key={visitor.id}
              className="rounded border-2 border-black bg-white px-2.5 py-1.5 text-[11px]"
              style={{ boxShadow: '2px 2px 0 0 #000' }}
            >
              <span className="font-bold">{visitor.surname} 🐾</span>
              <span className="mt-0.5 block text-zinc-600">
                {vi.realtime.hintLabel} {getVisitorHintText(visitor.id, visitor.surname)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
