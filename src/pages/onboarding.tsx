import { useState } from 'react';
import { useSetAtom } from 'jotai';
import { SCHOOLS, CLASSES, REGION, DEFAULT_HINT } from '@/config/app-content';
import { getLoggedInZaloUser } from '@/lib/zalo-auth';
import { joinClassAfterOnboarding } from '@/lib/class-founding';
import { db } from '@/lib/db';
import { emitRealtime } from '@/lib/realtime';
import { REALTIME_MESSAGES } from '@/config/app-content';
import { markOnboarded } from '@/lib/session';
import { vi } from '@/i18n/vi';
import { currentUserAtom, postsAtom, visitorsAtom } from '@/stores/atoms';

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

  const [school, setSchool] = useState(initialSchool || REGION.defaultSchool);
  const [className, setClassName] = useState(initialClass || REGION.defaultClass);

  const canProceed = Boolean(school && className);

  const finish = async () => {
    const profile = await db.initProfile(
      zaloUser.id,
      zaloUser.name,
      school,
      className,
      { ...DEFAULT_HINT },
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
        <h1 className="mb-1 text-xl font-bold">{vi.onboarding.title}</h1>
        <p className="mb-3 text-sm text-slate-600">{vi.onboarding.subtitle}</p>
        <p className="diary-border rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {vi.onboarding.zaloDone} {zaloUser.name}
        </p>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
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
      </main>

      <footer className="page-footer">
        <button
          type="button"
          disabled={!canProceed}
          onClick={() => void finish()}
          className="diary-border min-h-[48px] w-full rounded-lg bg-slate-800 py-3 text-sm font-bold text-white disabled:opacity-40"
        >
          {vi.onboarding.enterHome}
        </button>
      </footer>
    </div>
  );
}
