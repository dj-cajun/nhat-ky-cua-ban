import { db } from '@/lib/db';
import { getVisitorHintText } from '@/lib/visitor-hints';
import { useMessages } from '@/i18n';

export function TodayVisitorsPanel() {
  const t = useMessages();
  const todayVisitors = db.getTodayVisitors();

  return (
    <div className="cy-today-dropdown" role="menu">
      <p className="cy-today-dropdown-title">{t.home.todayVisitorsTitle}</p>

      {todayVisitors.length === 0 ? (
        <p className="cy-today-dropdown-empty">{t.home.todayVisitorsEmpty}</p>
      ) : (
        <ul className="cy-today-dropdown-list">
          {todayVisitors.map((visitor) => (
            <li key={visitor.id} className="cy-today-dropdown-item" role="menuitem">
              <span className="font-bold">{visitor.surname} 🐾</span>
              <span className="mt-0.5 block text-zinc-600">
                {t.realtime.hintLabel} {getVisitorHintText(visitor.id, visitor.surname)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
