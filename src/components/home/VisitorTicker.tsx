import { useSetAtom } from 'jotai';
import { mockStrangerUser } from '@/lib/mock-data';
import { showInterstitialAd } from '@/lib/zalo-ads';
import { mockVisitors } from '@/lib/mock-data';
import { strangerUserAtom, viewModeAtom } from '@/stores/atoms';

export function VisitorTicker() {
  const setViewMode = useSetAtom(viewModeAtom);
  const setStrangerUser = useSetAtom(strangerUserAtom);

  const handleWarp = async (visitorId: string, surname: string) => {
    await showInterstitialAd();
    setStrangerUser({ ...mockStrangerUser, id: visitorId, surname });
    setViewMode('stranger');
  };

  return (
    <section className="diary-border flex shrink-0 items-center gap-2 overflow-hidden rounded-lg px-3 py-2 text-xs">
      <span className="shrink-0">👀 최근 방문자:</span>
      <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
        {mockVisitors.map((visitor) => (
          <button
            key={visitor.id}
            type="button"
            onClick={() => void handleWarp(visitor.id, visitor.surname)}
            className="diary-border shrink-0 rounded-full bg-white px-2 py-0.5 font-medium hover:bg-amber-50"
          >
            {visitor.surname} 🐾
          </button>
        ))}
      </div>
    </section>
  );
}
