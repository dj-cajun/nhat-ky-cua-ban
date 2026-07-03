import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  bootstrapFounding,
  resolveFoundingRoute,
  type FoundingRoute,
} from '@/lib/founding-router';
import {
  getFounding,
  getInviteUrl,
  joinFoundingByToken,
  resetFounding,
  simulateFoundingJoin,
  submitFoundingQuizzes,
  verifyFoundingGate,
} from '@/lib/class-founding';
import { db } from '@/lib/db';
import { getLoggedInZaloUser } from '@/lib/zalo-auth';
import { FOUNDING_QUIZ_COUNT, FOUNDING_REQUIRED_MEMBERS, type ClassFoundingRecord } from '@/types/founding';
import { vi } from '@/i18n/vi';

type FoundingPageProps = {
  schoolName: string;
  className: string;
  joinToken?: string | null;
  onComplete: () => void;
};

type Screen = FoundingRoute['stage'];

function routeToScreen(route: FoundingRoute): Screen {
  return route.stage;
}

export function FoundingPage({ schoolName, className, joinToken, onComplete }: FoundingPageProps) {
  const zaloUser = getLoggedInZaloUser();
  const [record, setRecord] = useState<ClassFoundingRecord | null>(() =>
    getFounding(schoolName, className),
  );
  const [screen, setScreen] = useState<Screen>(() =>
    routeToScreen(resolveFoundingRoute(schoolName, className, zaloUser.id)),
  );
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [quizzes, setQuizzes] = useState(['', '', '']);
  const [gateAnswers, setGateAnswers] = useState(['', '', '']);
  const [gateError, setGateError] = useState(false);

  const inviteUrl = useMemo(
    () => (record ? getInviteUrl(record.inviteToken) : ''),
    [record],
  );

  const syncRoute = useCallback(
    (nextSchool = schoolName, nextClass = className) => {
      const route = resolveFoundingRoute(nextSchool, nextClass, zaloUser.id);
      if (route.stage === 'home') {
        onComplete();
        return;
      }
      if ('record' in route) {
        setRecord(route.record);
      }
      setScreen(routeToScreen(route));
    },
    [schoolName, className, zaloUser.id, onComplete],
  );

  useEffect(() => {
    if (!joinToken) return;

    const result = joinFoundingByToken(joinToken, zaloUser.id, zaloUser.name);
    if (!result.ok) {
      setMessage(vi.founding.joinErrors[result.reason]);
      syncRoute();
      return;
    }

    if (
      result.record.schoolName !== schoolName ||
      result.record.className !== className
    ) {
      db.updateProfile({
        schoolName: result.record.schoolName,
        className: result.record.className,
      });
    }

    setRecord(result.record);
    setMessage(vi.founding.joinSuccess);
    syncRoute(result.record.schoolName, result.record.className);
  }, [joinToken, schoolName, className, zaloUser.id, zaloUser.name, syncRoute]);

  useEffect(() => {
    if (joinToken) return;

    const route = resolveFoundingRoute(schoolName, className, zaloUser.id);
    if (route.stage === 'claim') {
      const bootstrapped = bootstrapFounding(
        schoolName,
        className,
        zaloUser.id,
        zaloUser.name,
      );
      if (bootstrapped) {
        setRecord(bootstrapped);
        setScreen(bootstrapped.status === 'forming' ? 'forming' : 'pending');
      }
      return;
    }

    syncRoute();
  }, [schoolName, className, zaloUser.id, zaloUser.name, joinToken, syncRoute]);

  const handleShare = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleSimulateJoin = () => {
    if (!record) return;
    const next = simulateFoundingJoin(record.classKey);
    if (next) {
      setRecord(next);
      setScreen(next.status === 'forming' ? 'forming' : 'pending');
    }
  };

  const handleSubmitQuizzes = () => {
    const result = submitFoundingQuizzes(schoolName, className, quizzes);
    if (!result.ok) {
      setMessage(vi.founding.quizErrors[result.reason]);
      return;
    }
    setMessage('');
    onComplete();
  };

  const handleVerifyGate = () => {
    const result = verifyFoundingGate(schoolName, className, gateAnswers, zaloUser.id);
    if (!result.ok) {
      setGateError(true);
      return;
    }
    setGateError(false);
    onComplete();
  };

  const handleResetDemo = () => {
    resetFounding(schoolName, className);
    const bootstrapped = bootstrapFounding(
      schoolName,
      className,
      zaloUser.id,
      zaloUser.name,
    );
    setRecord(bootstrapped);
    setScreen('pending');
    setQuizzes(['', '', '']);
    setGateAnswers(['', '', '']);
    setMessage('');
    setGateError(false);
  };

  const memberCount = record?.members.length ?? 0;

  return (
    <div className="cy-shell">
      <div className="cy-canvas flex min-h-0 flex-1 flex-col">
        <header className="cy-card flex shrink-0 items-center justify-between px-3 py-2">
          <span className="w-10" />
          <h1 className="text-sm font-bold">{vi.founding.title}</h1>
          <span className="w-10" />
        </header>

        <main className="min-h-0 flex-1 space-y-3 overflow-y-auto p-2">
          <section className="cy-card p-3">
            <p className="mb-1 text-[10px] font-bold tracking-wide text-y2k-pink">
              {schoolName} · {className}
            </p>
            <p className="text-xs leading-relaxed text-zinc-700">{vi.founding.summary}</p>
          </section>

          {screen === 'claim' && (
            <section className="cy-card space-y-3 p-3">
              <h2 className="text-sm font-bold">{vi.founding.step1Title}</h2>
              <p className="text-xs text-zinc-600">{vi.founding.step1Desc}</p>
              <p className="text-xs text-zinc-500">{vi.founding.bootstrapping}</p>
            </section>
          )}

          {screen === 'waiting' && record && (
            <section className="cy-card space-y-3 p-3">
              <div className="pencil-found-box">
                <p className="text-xs font-bold text-red-600">{vi.founding.waitingTitle}</p>
              </div>
              <p className="text-xs leading-relaxed text-zinc-600">{vi.founding.waitingDesc}</p>
              <div className="cy-card-inset px-3 py-2 text-center">
                <p className="text-[10px] text-zinc-500">{vi.founding.progressLabel}</p>
                <p className="text-lg font-bold">
                  {vi.founding.progress(memberCount, FOUNDING_REQUIRED_MEMBERS)}
                </p>
              </div>
            </section>
          )}

          {screen === 'pending' && record && (
            <section className="cy-card space-y-3 p-3">
              <div className="pencil-found-box">
                <p className="text-xs font-bold text-red-600">{vi.founding.lockedTitle}</p>
              </div>
              <p className="text-xs leading-relaxed">{vi.founding.step2Desc}</p>
              <div className="cy-card-inset px-3 py-2 text-center">
                <p className="text-[10px] text-zinc-500">{vi.founding.progressLabel}</p>
                <p className="text-lg font-bold">
                  {vi.founding.progress(memberCount, FOUNDING_REQUIRED_MEMBERS)}
                </p>
              </div>
              <ul className="space-y-1 text-[11px]">
                {record.members.map((member) => (
                  <li key={member.userId} className="pencil-list-item px-2 py-1">
                    {member.name}
                    {member.userId === record.founderUserId ? ` ${vi.founding.founderMark}` : ''}
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => void handleShare()} className="cy-hard-btn w-full rounded-lg bg-white py-2 text-sm font-bold">
                {copied ? vi.founding.copied : vi.founding.shareBtn}
              </button>
              <p className="break-all rounded bg-zinc-100 p-2 font-mono text-[9px] text-zinc-600">
                {inviteUrl}
              </p>
              <p className="text-[10px] text-zinc-500">{vi.founding.shareHint}</p>
              <button type="button" onClick={handleSimulateJoin} className="cy-card-inset w-full py-2 text-xs font-bold">
                {vi.founding.simulateJoin}
              </button>
            </section>
          )}

          {screen === 'forming' && record && (
            <section className="cy-card space-y-3 p-3">
              <h2 className="text-sm font-bold">{vi.founding.step4Title}</h2>
              <p className="text-xs text-zinc-600">{vi.founding.step4Desc}</p>
              {Array.from({ length: FOUNDING_QUIZ_COUNT }, (_, index) => (
                <div key={index}>
                  <label className="mb-1 block text-xs font-bold">
                    {vi.founding.quizLabel(index + 1)}
                  </label>
                  <input
                    type="text"
                    value={quizzes[index]}
                    onChange={(e) => {
                      const next = [...quizzes];
                      next[index] = e.target.value;
                      setQuizzes(next);
                    }}
                    className="cy-card-inset w-full rounded px-2 py-2 text-sm"
                    placeholder={vi.founding.quizPlaceholder}
                  />
                </div>
              ))}
              <button type="button" onClick={handleSubmitQuizzes} className="cy-write-btn w-full py-2 text-sm">
                {vi.founding.activateBtn}
              </button>
            </section>
          )}

          {screen === 'gate' && record && (
            <section className="cy-card space-y-3 p-3">
              <h2 className="text-sm font-bold">{vi.founding.gateTitle}</h2>
              <p className="text-xs text-zinc-600">{vi.founding.gateDesc}</p>
              {record.quizzes.map((quiz, index) => (
                <div key={`${quiz}-${index}`}>
                  <p className="mb-1 text-[11px] font-bold">{vi.founding.gateQuestion(index + 1)}</p>
                  <input
                    type="text"
                    value={gateAnswers[index]}
                    onChange={(e) => {
                      const next = [...gateAnswers];
                      next[index] = e.target.value;
                      setGateAnswers(next);
                      setGateError(false);
                    }}
                    className="cy-card-inset w-full rounded px-2 py-2 text-sm"
                    placeholder={vi.founding.gatePlaceholder}
                  />
                </div>
              ))}
              {gateError && <p className="text-xs text-red-600">{vi.founding.gateWrong}</p>}
              <button type="button" onClick={handleVerifyGate} className="cy-write-btn w-full py-2 text-sm">
                {vi.founding.gateSubmit}
              </button>
            </section>
          )}

          {message && (
            <p className="pencil-message">{message}</p>
          )}

          <section className="cy-card-inset p-3">
            <p className="mb-2 text-[10px] font-bold text-zinc-500">{vi.founding.flowTitle}</p>
            <ol className="list-decimal space-y-1 pl-4 text-[10px] leading-relaxed text-zinc-600">
              {vi.founding.flowSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <button type="button" onClick={handleResetDemo} className="mt-3 text-[10px] font-bold text-zinc-500 underline">
              {vi.founding.resetDemo}
            </button>
          </section>
        </main>
      </div>
    </div>
  );
}
