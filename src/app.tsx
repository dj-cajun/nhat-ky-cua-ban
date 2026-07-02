import { Provider as JotaiProvider, useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useEffect, useState } from 'react';
import { HomePage } from '@/pages/home';
import { LoginPage } from '@/pages/login';
import { OnboardingPage } from '@/pages/onboarding';
import { DotoriPage } from '@/pages/dotori';
import { BoardPage } from '@/pages/board';
import { AlbumPage } from '@/pages/album';
import { db } from '@/lib/db';
import { initDemoSession, isDemoMode } from '@/lib/demo-init';
import { isZaloLoggedIn } from '@/lib/zalo-auth';
import { handleDevReset, isOnboarded } from '@/lib/session';
import { vi } from '@/i18n/vi';
import { appPageAtom, currentUserAtom, postsAtom, visitorsAtom } from '@/stores/atoms';

type AppStage = 'boot' | 'login' | 'onboarding' | 'app';

function resolveStage(): AppStage {
  if (!isZaloLoggedIn()) return 'login';
  if (!isOnboarded()) return 'onboarding';
  return 'app';
}

function AppContent() {
  const page = useAtomValue(appPageAtom);
  const setPage = useSetAtom(appPageAtom);
  const setUser = useSetAtom(currentUserAtom);
  const setPosts = useSetAtom(postsAtom);
  const setVisitors = useSetAtom(visitorsAtom);
  const [stage, setStage] = useState<AppStage>('boot');

  const hydrateApp = useCallback(() => {
    const profile = db.getProfile();
    if (profile) {
      setUser(profile);
      setPosts(db.getPosts());
      setVisitors(db.getVisitors());
    }
  }, [setUser, setPosts, setVisitors]);

  useEffect(() => {
    if (handleDevReset()) {
      setStage('login');
      return;
    }

    if (!isOnboarded() && isDemoMode()) {
      if (!isZaloLoggedIn()) {
        void import('@/lib/zalo-auth').then(({ loginWithZalo }) =>
          loginWithZalo().then(() => {
            initDemoSession();
            window.location.reload();
          }),
        );
        return;
      }
      initDemoSession();
      window.location.reload();
      return;
    }

    const next = resolveStage();
    setStage(next);
    if (next === 'app') {
      hydrateApp();
    }
  }, [hydrateApp]);

  if (stage === 'boot') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#faf9f6] text-sm text-slate-500">
        {vi.app.loading}
      </div>
    );
  }

  if (stage === 'login') {
    return <LoginPage onLoggedIn={() => setStage('onboarding')} />;
  }

  if (stage === 'onboarding') {
    return (
      <OnboardingPage
        onComplete={() => {
          setStage('app');
          hydrateApp();
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
