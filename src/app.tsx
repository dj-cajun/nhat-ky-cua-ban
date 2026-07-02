import { useEffect } from 'react';
import { Provider as JotaiProvider, useAtomValue, useSetAtom } from 'jotai';
import { HomePage } from '@/pages/home';
import { OnboardingPage } from '@/pages/onboarding';
import { DotoriPage } from '@/pages/dotori';
import { db } from '@/lib/db';
import { appPageAtom, currentUserAtom, postsAtom, visitorsAtom } from '@/stores/atoms';

function AppContent() {
  const page = useAtomValue(appPageAtom);
  const setPage = useSetAtom(appPageAtom);
  const setUser = useSetAtom(currentUserAtom);
  const setPosts = useSetAtom(postsAtom);
  const setVisitors = useSetAtom(visitorsAtom);

  const onboarded = localStorage.getItem('onboarding_complete') === 'true';

  useEffect(() => {
    if (onboarded) {
      const profile = db.getProfile();
      if (profile) {
        setUser(profile);
        setPosts(db.getPosts());
        setVisitors(db.getVisitors());
      }
    }
  }, [onboarded, setUser, setPosts, setVisitors]);

  if (!onboarded) {
    return <OnboardingPage onComplete={() => window.location.reload()} />;
  }

  if (page === 'dotori') {
    return <DotoriPage onBack={() => setPage('home')} />;
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
