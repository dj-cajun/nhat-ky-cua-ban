import { useSetAtom } from 'jotai';
import { db } from '@/lib/db';
import { showInterstitialAd } from '@/lib/zalo-ads';
import { vi } from '@/i18n/vi';
import { strangerUserAtom, viewModeAtom, visitorsAtom, strangerHostIdAtom } from '@/stores/atoms';

export function VisitorTicker() {
  const setViewMode = useSetAtom(viewModeAtom);
  const setStrangerUser = useSetAtom(strangerUserAtom);
  const setVisitors = useSetAtom(visitorsAtom);
  const setHostId = useSetAtom(strangerHostIdAtom);
  const visitors = db.getVisitors();

  const handleWarp = async (visitorId: string) => {
    const classmate = db.getClassmateById(visitorId);
    if (!classmate) return;

    await showInterstitialAd();
    setStrangerUser(classmate);
    setHostId(visitorId);
    setViewMode('stranger');

    const profile = db.getProfile();
    if (profile) {
      db.addVisitor({ id: profile.id, surname: profile.surname, visitedAt: new Date().toISOString() });
      setVisitors(db.getVisitors());
    }
  };

  return (
    <section className="cy-card flex shrink-0 items-center gap-2 px-2.5 py-1.5 text-[11px]">
      <span className="shrink-0 font-bold">{vi.home.recentVisitors}</span>
      <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
        {visitors.map((visitor) => (
          <button
            key={visitor.id}
            type="button"
            onClick={() => void handleWarp(visitor.id)}
            className="cy-pill"
          >
            {visitor.surname} 🐾
          </button>
        ))}
      </div>
    </section>
  );
}
