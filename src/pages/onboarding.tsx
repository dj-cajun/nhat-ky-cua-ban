import { useState } from 'react';
import { useSetAtom } from 'jotai';
import type { HintData } from '@/types';
import { SCHOOLS, CLASSES, REGION, DEFAULT_HINT } from '@/config/app-content';
import { getLoggedInZaloUser } from '@/lib/zalo-auth';
import { db } from '@/lib/db';
import { emitRealtime } from '@/lib/realtime';
import { REALTIME_MESSAGES } from '@/config/app-content';
import { currentUserAtom, postsAtom, visitorsAtom } from '@/stores/atoms';

interface OnboardingPageProps {
  onComplete: () => void;
}

export function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const setUser = useSetAtom(currentUserAtom);
  const setPosts = useSetAtom(postsAtom);
  const setVisitors = useSetAtom(visitorsAtom);
  const zaloUser = getLoggedInZaloUser();

  const [step, setStep] = useState(0);
  const [school, setSchool] = useState(REGION.defaultSchool);
  const [className, setClassName] = useState(REGION.defaultClass);
  const [hint, setHint] = useState<HintData>({ ...DEFAULT_HINT });

  const canProceed =
    step === 0 ? Boolean(school && className) : step === 1 ? true : false;

  const finish = () => {
    const profile = db.initProfile(
      zaloUser.id,
      zaloUser.name,
      school,
      className,
      hint,
    );
    setUser(profile);
    setPosts(db.getPosts());
    setVisitors(db.getVisitors());
    localStorage.setItem('onboarding_complete', 'true');
    emitRealtime({ type: 'member_joined', message: REALTIME_MESSAGES.memberJoined });
    onComplete();
  };

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col overflow-hidden bg-[#faf9f6] p-4">
      <h1 className="mb-1 text-xl font-bold">Nhật ký của bạn</h1>
      <p className="mb-4 text-sm text-slate-600">학교·학급만 선택하면 바로 시작</p>

      <p className="diary-border mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
        ✓ Zalo 로그인 완료 · {zaloUser.name}
      </p>

      {step === 0 && (
        <section className="diary-panel flex-1 p-4">
          <h2 className="mb-4 text-sm font-bold">학교 · 학급 선택</h2>
          <label className="mb-3 block text-xs">학교</label>
          <select
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            className="diary-border mb-4 w-full rounded px-3 py-2 text-sm"
          >
            <option value="">선택하세요</option>
            {SCHOOLS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <label className="mb-3 block text-xs">학급 (Lớp)</label>
          <select
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="diary-border w-full rounded px-3 py-2 text-sm"
          >
            <option value="">선택하세요</option>
            {CLASSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </section>
      )}

      {step === 1 && (
        <section className="diary-panel flex-1 space-y-4 overflow-y-auto p-4">
          <h2 className="text-sm font-bold">힌트 데이터 (투표 실드용)</h2>
          <p className="text-xs text-slate-500">암호화되어 저장됩니다</p>
          <div>
            <label className="mb-1 block text-xs">성별</label>
            <select
              value={hint.gender}
              onChange={(e) =>
                setHint({ ...hint, gender: e.target.value as HintData['gender'] })
              }
              className="diary-border w-full rounded px-3 py-2 text-sm"
            >
              <option value="female">여성</option>
              <option value="male">남성</option>
              <option value="other">기타</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs">키 범위</label>
            <select
              value={hint.heightRange}
              onChange={(e) => setHint({ ...hint, heightRange: e.target.value })}
              className="diary-border w-full rounded px-3 py-2 text-sm"
            >
              <option value="150-155">150~155cm</option>
              <option value="160-165">160~165cm</option>
              <option value="170-175">170~175cm</option>
              <option value="180-185">180~185cm</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs">MBTI 앞자리</label>
            <select
              value={hint.mbtiPrefix}
              onChange={(e) => setHint({ ...hint, mbtiPrefix: e.target.value })}
              className="diary-border w-full rounded px-3 py-2 text-sm"
            >
              <option value="E">E (외향)</option>
              <option value="I">I (내향)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs">등교 수단</label>
            <select
              value={hint.commute}
              onChange={(e) =>
                setHint({ ...hint, commute: e.target.value as HintData['commute'] })
              }
              className="diary-border w-full rounded px-3 py-2 text-sm"
            >
              <option value="motorbike">오토바이</option>
              <option value="bicycle">자전거</option>
              <option value="walk">도보</option>
              <option value="bus">버스</option>
            </select>
          </div>
        </section>
      )}

      <div className="mt-4 flex gap-2">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="diary-border flex-1 rounded-lg py-3 text-sm"
          >
            이전
          </button>
        )}
        <button
          type="button"
          disabled={!canProceed}
          onClick={() => {
            if (step < 1) {
              setStep(1);
            } else {
              finish();
            }
          }}
          className="diary-border flex-1 rounded-lg bg-slate-800 py-3 text-sm text-white disabled:opacity-40"
        >
          {step < 1 ? '다음' : '시작하기'}
        </button>
      </div>
    </div>
  );
}
