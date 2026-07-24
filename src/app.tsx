import { useEffect, useState } from 'react';
import { Provider as JotaiProvider, useAtomValue, useSetAtom } from 'jotai';
import { SignupPage } from '@/pages/v1/signup';
import { UniversePage } from '@/pages/v1/universe';
import { CirclePage } from '@/pages/v1/circle';
import { DiaryPage, DiaryEditPage } from '@/pages/v1/diary';
import {
  CircleCreatePage,
  CircleSetupPage,
  InvitesPage,
} from '@/pages/v1/circle-create';
import {
  CircleJoinPage,
  JoinStatusPage,
  RecommendationDetailPage,
  RecommendationsPage,
} from '@/pages/v1/join';
import * as store from '@/lib/v1-store';
import {
  v1CirclesAtom,
  v1DiaryOwnerIdAtom,
  v1PageAtom,
  v1ProfileAtom,
} from '@/stores/v1-atoms';

type Stage = 'boot' | 'signup' | 'app';

function V1App() {
  const [stage, setStage] = useState<Stage>('boot');
  const page = useAtomValue(v1PageAtom);
  const setPage = useSetAtom(v1PageAtom);
  const setProfile = useSetAtom(v1ProfileAtom);
  const setCircles = useSetAtom(v1CirclesAtom);
  const setDiaryOwner = useSetAtom(v1DiaryOwnerIdAtom);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset') === '1') {
      store.clearV1Data();
      params.delete('reset');
      const q = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${q ? `?${q}` : ''}`);
      setStage('signup');
      return;
    }

    const profile = store.getSessionProfile();
    if (!profile) {
      setStage('signup');
      return;
    }

    store.ensureDemoDirectory(profile.id);
    setProfile(profile);
    setCircles(store.listMyCircles(profile.id));
    setDiaryOwner(profile.id);
    setPage('universe');
    setStage('app');
  }, [setCircles, setDiaryOwner, setPage, setProfile]);

  if (stage === 'boot') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f7f4ef] text-sm text-[#8a8178]">
        불러오는 중…
      </div>
    );
  }

  if (stage === 'signup') {
    return (
      <SignupPage
        onComplete={() => {
          const profile = store.getSessionProfile();
          if (!profile) return;
          setProfile(profile);
          setCircles(store.listMyCircles(profile.id));
          setDiaryOwner(profile.id);
          setPage('universe');
          setStage('app');
        }}
      />
    );
  }

  switch (page) {
    case 'circle':
      return <CirclePage />;
    case 'diary':
      return <DiaryPage />;
    case 'diary-edit':
      return <DiaryEditPage />;
    case 'circle-create':
      return <CircleCreatePage />;
    case 'circle-setup':
      return <CircleSetupPage />;
    case 'invites':
      return <InvitesPage />;
    case 'circle-join':
      return <CircleJoinPage />;
    case 'join-status':
      return <JoinStatusPage />;
    case 'recommendations':
      return <RecommendationsPage />;
    case 'recommendation-detail':
      return <RecommendationDetailPage />;
    case 'universe':
    default:
      return <UniversePage />;
  }
}

export function App() {
  return (
    <JotaiProvider>
      <V1App />
    </JotaiProvider>
  );
}
