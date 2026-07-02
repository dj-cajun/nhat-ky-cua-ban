import { useState } from 'react';
import { useSetAtom } from 'jotai';
import type { HintData } from '@/types';
import { SCHOOLS, CLASSES, REGION, DEFAULT_HINT } from '@/config/app-content';
import { getLoggedInZaloUser } from '@/lib/zalo-auth';
import { db } from '@/lib/db';
import { emitRealtime } from '@/lib/realtime';
import { REALTIME_MESSAGES } from '@/config/app-content';
import { markOnboarded } from '@/lib/session';
import { vi } from '@/i18n/vi';
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
    markOnboarded();
    emitRealtime({ type: 'member_joined', message: REALTIME_MESSAGES.memberJoined });
    onComplete();
  };

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col overflow-hidden bg-[#faf9f6] p-4">
      <h1 className="mb-1 text-xl font-bold">Nhật ký của bạn</h1>
      <p className="mb-4 text-sm text-slate-600">{vi.onboarding.subtitle}</p>

      <p className="diary-border mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
        {vi.onboarding.zaloDone} {zaloUser.name}
      </p>

      {step === 0 && (
        <section className="diary-panel flex-1 p-4">
          <h2 className="mb-4 text-sm font-bold">{vi.onboarding.schoolClass}</h2>
          <label className="mb-3 block text-xs">{vi.onboarding.school}</label>
          <select
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            className="diary-border mb-4 w-full rounded px-3 py-2 text-sm"
          >
            <option value="">{vi.onboarding.select}</option>
            {SCHOOLS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <label className="mb-3 block text-xs">{vi.onboarding.class}</label>
          <select
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="diary-border w-full rounded px-3 py-2 text-sm"
          >
            <option value="">{vi.onboarding.select}</option>
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
          <h2 className="text-sm font-bold">{vi.onboarding.hintTitle}</h2>
          <p className="text-xs text-slate-500">{vi.onboarding.hintEncrypted}</p>
          <div>
            <label className="mb-1 block text-xs">{vi.onboarding.gender}</label>
            <select
              value={hint.gender}
              onChange={(e) =>
                setHint({ ...hint, gender: e.target.value as HintData['gender'] })
              }
              className="diary-border w-full rounded px-3 py-2 text-sm"
            >
              <option value="female">{vi.onboarding.female}</option>
              <option value="male">{vi.onboarding.male}</option>
              <option value="other">{vi.onboarding.other}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs">{vi.onboarding.height}</label>
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
            <label className="mb-1 block text-xs">{vi.onboarding.mbti}</label>
            <select
              value={hint.mbtiPrefix}
              onChange={(e) => setHint({ ...hint, mbtiPrefix: e.target.value })}
              className="diary-border w-full rounded px-3 py-2 text-sm"
            >
              <option value="E">{vi.onboarding.extrovert}</option>
              <option value="I">{vi.onboarding.introvert}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs">{vi.onboarding.commute}</label>
            <select
              value={hint.commute}
              onChange={(e) =>
                setHint({ ...hint, commute: e.target.value as HintData['commute'] })
              }
              className="diary-border w-full rounded px-3 py-2 text-sm"
            >
              <option value="motorbike">{vi.onboarding.motorbike}</option>
              <option value="bicycle">{vi.onboarding.bicycle}</option>
              <option value="walk">{vi.onboarding.walk}</option>
              <option value="bus">{vi.onboarding.bus}</option>
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
            {vi.onboarding.back}
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
          {step < 1 ? vi.onboarding.next : vi.onboarding.start}
        </button>
      </div>
    </div>
  );
}
