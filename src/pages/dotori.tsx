import { useState } from 'react';
import { useSetAtom } from 'jotai';
import { db } from '@/lib/db';
import { showRewardedVideoAd } from '@/lib/zalo-ads';
import { OFFERWALL_URLS, AFFILIATE_ITEMS } from '@/config/app-content';
import { currentUserAtom } from '@/stores/atoms';

interface DotoriPageProps {
  onBack: () => void;
}

const MISSIONS = [
  {
    id: 'video' as const,
    icon: '🎬',
    title: '보상형 동영상 시청',
    desc: '15~30초 광고 시청',
    reward: 2,
    repeatable: true,
  },
  {
    id: 'shopee' as const,
    icon: '🛒',
    title: '쇼피 앱 구경하기',
    desc: 'AccessTrade 오퍼월',
    reward: 2,
    repeatable: false,
  },
  {
    id: 'tiktok' as const,
    icon: '🎵',
    title: '틱톡 계정 팔로우',
    desc: 'AdFlex 미션',
    reward: 3,
    repeatable: false,
  },
];

export function DotoriPage({ onBack }: DotoriPageProps) {
  const setUser = useSetAtom(currentUserAtom);
  const [missions, setMissions] = useState(db.getDotoriMissions());
  const [loading, setLoading] = useState<string | null>(null);
  const profile = db.getProfile();

  const handleMission = async (id: 'video' | 'shopee' | 'tiktok') => {
    if (id !== 'video' && missions[id]) return;

    setLoading(id);

    if (id === 'video') {
      const result = await showRewardedVideoAd();
      if (result.completed) {
        const balance = db.completeMission('video');
        setUser((u) => ({ ...u, dotoriBalance: balance }));
        setMissions(db.getDotoriMissions());
      }
    } else if (id === 'shopee') {
      window.open(OFFERWALL_URLS.shopee, '_blank');
      const balance = db.completeMission('shopee');
      setUser((u) => ({ ...u, dotoriBalance: balance }));
      setMissions(db.getDotoriMissions());
    } else {
      window.open(OFFERWALL_URLS.tiktok, '_blank');
      const balance = db.completeMission('tiktok');
      setUser((u) => ({ ...u, dotoriBalance: balance }));
      setMissions(db.getDotoriMissions());
    }

    setLoading(null);
  };

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col overflow-hidden bg-[#faf9f6] p-4">
      <header className="mb-4 flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-sm font-bold">
          ← 돌아가기
        </button>
        <h1 className="text-sm font-bold">🌰 도토리 충전소</h1>
        <span className="text-sm font-bold">{profile?.dotoriBalance ?? 0}</span>
      </header>

      <section className="mb-4">
        <h2 className="mb-2 text-xs font-bold text-slate-600">미션 보드</h2>
        <div className="space-y-2">
          {MISSIONS.map((m) => {
            const done = m.id !== 'video' && missions[m.id];
            return (
              <button
                key={m.id}
                type="button"
                disabled={done || loading === m.id}
                onClick={() => void handleMission(m.id)}
                className="diary-panel flex w-full items-center gap-3 p-3 text-left disabled:opacity-50"
              >
                <span className="text-2xl">{m.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold">{m.title}</p>
                  <p className="text-xs text-slate-500">{m.desc}</p>
                </div>
                <span className="text-xs font-bold text-amber-700">
                  {done ? '완료' : `+${m.reward} 🌰`}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-4 flex-1 overflow-y-auto">
        <h2 className="mb-2 text-xs font-bold text-slate-600">제휴 커머스</h2>
        <div className="grid grid-cols-2 gap-2">
          {AFFILIATE_ITEMS.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="diary-panel flex flex-col items-center gap-1 p-3 text-center"
            >
              <span className="text-2xl">{link.emoji}</span>
              <span className="text-xs font-bold">{link.name}</span>
            </a>
          ))}
        </div>
      </section>

      <p className="text-center text-[10px] text-slate-400">
        직접 결제 없음 · 광고·제휴 수익 모델
      </p>
    </div>
  );
}
