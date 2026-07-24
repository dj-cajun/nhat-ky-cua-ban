import { useState } from 'react';
import { useSetAtom } from 'jotai';
import { SCHOOLS, CLASSES, REGION } from '@/config/app-content';
import { DEFAULT_HINT_FORM } from '@/config/hint-options';
import { HintForm } from '@/components/onboarding/HintForm';
import { getLoggedInZaloUser } from '@/lib/zalo-auth';
import { joinClassAfterOnboarding } from '@/lib/class-founding';
import { db } from '@/lib/db';
import { emitRealtime } from '@/lib/realtime';
import { REALTIME_MESSAGES } from '@/config/app-content';
import { markOnboarded } from '@/lib/session';
import { vi } from '@/i18n/vi';
import { currentUserAtom, postsAtom, visitorsAtom } from '@/stores/atoms';
import type { HintData } from '@/types';

interface OnboardingPageProps {
  onComplete: () => void;
  initialSchool?: string;
  initialClass?: string;
}

export function OnboardingPage({ onComplete, initialSchool, initialClass }: OnboardingPageProps) {
  const setUser = useSetAtom(currentUserAtom);
  const setPosts = useSetAtom(postsAtom);
  const setVisitors = useSetAtom(visitorsAtom);
  const zaloUser = getLoggedInZaloUser();

  const [step, setStep] = useState(0);
  const [school, setSchool] = useState(initialSchool || REGION.defaultSchool);
  const [className, setClassName] = useState(initialClass || REGION.defaultClass);
  const [hint, setHint] = useState<HintData>({ ...DEFAULT_HINT_FORM });

  const canProceedClass = Boolean(school && className);

  const finish = async () => {
    const profile = await db.initProfile(
      zaloUser.id,
      zaloUser.name,
      school,
      className,
      hint,
    );
    joinClassAfterOnboarding(school, className, profile.id, profile.realName);
    setUser(profile);
    setPosts(db.getPosts());
    setVisitors(db.getVisitors());
    markOnboarded();
    emitRealtime({ type: 'member_joined', message: REALTIME_MESSAGES.memberJoined });
    onComplete();
  };

  return (
    <div className="page-shell p-4">
      <header className="shrink-0 pb-3">
        <h1 className="mb-1 text-xl font-bold">
          {step === 0 ? vi.onboarding.title : vi.onboarding.hintTitle}
        </h1>
        <p className="mb-3 text-sm text-slate-600">
          {step === 0 ? vi.onboarding.subtitle : vi.onboarding.hintSubtitle}
        </p>
        <p className="diary-border rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {vi.onboarding.zaloDone} {zaloUser.name}
        </p>
      </header>

      <main className="scrollbar-hide min-h-0 flex-1 overflow-y-auto">
        {step === 0 ? (
          <section className="diary-panel p-4">
            <h2 className="mb-2 text-sm font-bold">{vi.onboarding.schoolClass}</h2>
            <p className="mb-4 text-xs leading-relaxed text-slate-500">{vi.onboarding.classDesc}</p>
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
        ) : (
          <section className="diary-panel p-4">
            <HintForm value={hint} onChange={setHint} />
          </section>
        )}
      </main>

      <footer className="page-footer space-y-2">
        {step === 1 && (
          <button
            type="button"
            onClick={() => setStep(0)}
            className="w-full py-1 text-center text-xs text-slate-500 underline-offset-2 hover:underline"
          >
            {vi.onboarding.back}
          </button>
        )}
        <button
          type="button"
          disabled={step === 0 && !canProceedClass}
          onClick={() => {
            if (step === 0) {
              setStep(1);
              return;
            }
            void finish();
          }}
          className="pencil-btn-primary min-h-[48px] disabled:opacity-40"
        >
          {step === 0 ? vi.onboarding.next : vi.onboarding.enterHome}
        </button>
      </footer>
    </div>
  );
}
