import { useState } from 'react';
import type { HintData } from '@/types';

interface OnboardingPageProps {
  onComplete: () => void;
}

const SCHOOLS = ['Marie Curie', 'Lê Hồng Phong', 'Nguyễn Thị Minh Khai'];
const CLASSES = ['Lớp 10A', 'Lớp 10B', 'Lớp 11A', 'Lớp 11B', 'Lớp 12A'];

export function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const [step, setStep] = useState(0);
  const [school, setSchool] = useState('');
  const [className, setClassName] = useState('');
  const [hint, setHint] = useState<HintData>({
    gender: 'female',
    heightRange: '160-165',
    mbtiPrefix: 'E',
    commute: 'motorbike',
  });

  const canProceed =
    step === 0 ? Boolean(school && className) : step === 1 ? true : false;

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col overflow-hidden bg-[#faf9f6] p-4">
      <h1 className="mb-1 text-xl font-bold">Nhật ký của bạn</h1>
      <p className="mb-6 text-sm text-slate-600">너의 다이어리 — Zalo 간편 가입</p>

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
        <section className="diary-panel flex-1 space-y-4 p-4">
          <h2 className="text-sm font-bold">힌트 데이터 (투표 실드용)</h2>
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
              localStorage.setItem('onboarding_complete', 'true');
              onComplete();
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
