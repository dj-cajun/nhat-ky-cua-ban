import { Provider as JotaiProvider, useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useEffect, useState } from 'react';
import { IntroPage } from '@/pages/intro';
import { HomePage } from '@/pages/home';
import { LoginPage } from '@/pages/login';
import { OnboardingPage } from '@/pages/onboarding';
import { DotoriPage } from '@/pages/dotori';
import { BoardPage } from '@/pages/board';
import { AlbumPage } from '@/pages/album';
import { FoundingPage } from '@/pages/founding';
import { db } from '@/lib/db';
import { initDemoSession, isDemoMode } from '@/lib/demo-init';
import { canEnterClassHome, joinFoundingByToken } from '@/lib/class-founding';
import { consumeJoinToken, parseFoundingUrl, peekJoinToken } from '@/lib/founding-params';
import { getOnboardingPrefillFromToken } from '@/lib/founding-router';
import { ensureProfileName } from '@/lib/profile-name';
import { ensureHintSealOnProfile } from '@/lib/supabase-sync';
import { isZaloLoggedIn } from '@/lib/zalo-auth';
import {
  captureDemoFlags,
  handleDevReset,
  isIntroSeen,
  isOnboarded,
  isVoteDemoActive,
  markIntroSeen,
} from '@/lib/session';
import { primeProfanityBlacklist } from '@/lib/profanity-remote';
import { vi } from '@/i18n/vi';
import { appPageAtom, currentUserAtom, postsAtom, visitorsAtom } from '@/stores/atoms';
import { useProfileFont } from '@/hooks/useProfileFont';

type AppStage = 'boot' | 'intro' | 'login' | 'onboarding' | 'founding' | 'app';

function resolveStage(): AppStage {
  if (!isZaloLoggedIn()) return 'login';
  if (!isOnboarded()) return 'onboarding';

  const profile = db.getProfile();
  if (
    profile &&
    !canEnterClassHome(profile.schoolName, profile.className, profile.id)
  ) {
    return 'founding';
  }

  return 'app';
}

function AppContent() {
  const page = useAtomValue(appPageAtom);
  const setPage = useSetAtom(appPageAtom);
  const setUser = useSetAtom(currentUserAtom);
  const setPosts = useSetAtom(postsAtom);
  const setVisitors = useSetAtom(visitorsAtom);
  const [stage, setStage] = useState<AppStage>('boot');
  const [foundingJoinToken, setFoundingJoinToken] = useState<string | null>(null);
  const [onboardingPrefill, setOnboardingPrefill] = useState<{
    schoolName: string;
    className: string;
  } | null>(null);

  useProfileFont();

  const hydrateApp = useCallback(() => {
    const profile = db.getProfile();
    if (profile) {
      const repaired = ensureProfileName(profile);
      setUser(repaired);
      setPosts(db.getPosts());
      setVisitors(db.getVisitors());
    }
  }, [setUser, setPosts, setVisitors]);

  const enterApp = useCallback(() => {
    setStage('app');
    hydrateApp();
    setPage('home');
  }, [hydrateApp, setPage]);

  useEffect(() => {
    const foundingIntent = parseFoundingUrl();
    if (foundingIntent.joinToken) {
      setFoundingJoinToken(foundingIntent.joinToken);
      setOnboardingPrefill(getOnboardingPrefillFromToken(foundingIntent.joinToken));
    } else {
      const pendingToken = peekJoinToken();
      if (pendingToken) {
        setFoundingJoinToken(pendingToken);
        setOnboardingPrefill(getOnboardingPrefillFromToken(pendingToken));
      }
    }

    captureDemoFlags();

    if (handleDevReset()) {
      setStage('intro');
      return;
    }

    primeProfanityBlacklist();

    if (!isIntroSeen() && !(isDemoMode() && isVoteDemoActive())) {
      setStage('intro');
      return;
    }

    if (!isIntroSeen() && isDemoMode() && isVoteDemoActive()) {
      markIntroSeen();
    }

    if (!isOnboarded() && isDemoMode()) {
      if (!isZaloLoggedIn()) {
        void import('@/lib/zalo-auth').then(({ loginWithZalo }) =>
          loginWithZalo().then(() => {
            void initDemoSession().then(() => window.location.reload());
          }),
        );
        return;
      }
      void initDemoSession().then(() => window.location.reload());
      return;
    }

    const next = resolveStage();
    setStage(next);
    if (next === 'app') {
      void ensureHintSealOnProfile().then(() => hydrateApp());
    }
  }, [hydrateApp]);

  if (stage === 'boot') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#faf9f6] text-sm text-slate-500">
        {vi.app.loading}
      </div>
    );
  }

  if (stage === 'intro') {
    return (
      <IntroPage
        onComplete={() => {
          markIntroSeen();
          setStage('login');
        }}
      />
    );
  }

  if (stage === 'login') {
    return <LoginPage onLoggedIn={() => setStage('onboarding')} />;
  }

  if (stage === 'onboarding') {
    return (
      <OnboardingPage
        initialSchool={onboardingPrefill?.schoolName}
        initialClass={onboardingPrefill?.className}
        onComplete={() => {
          const profile = db.getProfile();
          const token = foundingJoinToken ?? consumeJoinToken();
          if (profile && token) {
            joinFoundingByToken(token, profile.id, profile.realName);
            setFoundingJoinToken(null);
          }
          void ensureHintSealOnProfile().then(() => enterApp());
        }}
      />
    );
  }

  if (stage === 'founding') {
    const profile = db.getProfile();
    if (!profile) {
      setStage('onboarding');
      return null;
    }

    const joinToken = foundingJoinToken ?? consumeJoinToken();

    return (
      <FoundingPage
        schoolName={profile.schoolName}
        className={profile.className}
        joinToken={joinToken}
        onComplete={() => {
          setFoundingJoinToken(null);
          enterApp();
        }}
      />
    );
  }

  if (page === 'dotori') {
    return (
      <DotoriPage
        onBack={() => setPage('home')}
        onLogout={() => setStage('login')}
      />
    );
  }

  if (page === 'board') {
    return <BoardPage onBack={() => setPage('home')} />;
  }

  if (page === 'album') {
    return <AlbumPage onBack={() => setPage('home')} />;
  }

  return <HomePage />;
}

export function App() {
  return (
    <JotaiProvider>
      <AppContent />
    </JotaiProvider>
  );
}
