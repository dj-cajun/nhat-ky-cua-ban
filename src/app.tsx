import { Provider as JotaiProvider, useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useState } from 'react';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { useMessages } from '@/i18n';
import * as v1Store from '@/lib/v1-store';
import { DiaryHomePage } from '@/pages/diary-home';
import { SignupPage } from '@/pages/v1/signup';
import { UniversePage } from '@/pages/v1/universe';
import { CirclePage } from '@/pages/v1/circle';
import { DiaryEditPage } from '@/pages/v1/diary';
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
import {
  v1CirclesAtom,
  v1DiaryOwnerIdAtom,
  v1PageAtom,
  v1ProfileAtom,
} from '@/stores/v1-atoms';

type Stage = 'boot' | 'signup' | 'app';

/**
 * Your Diary web — default product surface.
 * Mini-hompy pastel UI maps to circle diary data.
 * Legacy school/Zalo shell is not mounted (see legacy-minihome-reference/).
 */
function YourDiaryApp() {
  const t = useMessages();
  const [stage, setStage] = useState<Stage>('boot');
  const page = useAtomValue(v1PageAtom);
  const setPage = useSetAtom(v1PageAtom);
  const setProfile = useSetAtom(v1ProfileAtom);
  const setCircles = useSetAtom(v1CirclesAtom);
  const setDiaryOwner = useSetAtom(v1DiaryOwnerIdAtom);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset') === '1') {
      v1Store.clearV1Data();
      params.delete('reset');
      const q = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${q ? `?${q}` : ''}`);
      setStage('signup');
      return;
    }

    const profile = v1Store.getSessionProfile();
    if (!profile) {
      setStage('signup');
      return;
    }

    v1Store.ensureDemoDirectory(profile.id);
    seedDemoAtmosphere(profile.id);
    v1Store.ensureDemoOpenCircle(profile.id);
    setProfile(profile);
    setCircles(v1Store.listMyCircles(profile.id));
    setDiaryOwner(profile.id);
    setPage('universe');
    setStage('app');
  }, [setCircles, setDiaryOwner, setPage, setProfile]);

  if (stage === 'boot') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#faf9f6] text-sm text-slate-500">
        <div className="absolute right-4 top-4">
          <LanguageSwitcher compact />
        </div>
        {t.app.loading}
      </div>
    );
  }

  if (stage === 'signup') {
    return (
      <SignupPage
        onComplete={() => {
          const profile = v1Store.getSessionProfile();
          if (!profile) return;
          v1Store.ensureDemoDirectory(profile.id);
          seedDemoAtmosphere(profile.id);
          v1Store.ensureDemoOpenCircle(profile.id);
          setProfile(profile);
          setCircles(v1Store.listMyCircles(profile.id));
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
      return <DiaryHomePage />;
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

/** Soft demo diary/guestbook so mini-hompy doesn’t feel empty */
function seedDemoAtmosphere(selfId: string) {
  const friends = v1Store.listDirectoryProfiles(selfId);
  for (const f of friends.slice(0, 3)) {
    if (!v1Store.getDiaryEntry(f.id)) {
      v1Store.upsertDiaryEntry({
        userId: f.id,
        mood: 'calm',
        tenCharText: 'quiet day',
        shortText: 'A quiet corner and one good song.',
        visibilityMode: 'all_circles',
      });
    }
  }
  if (v1Store.listGuestbook(selfId, 1).length === 0 && friends[0]) {
    v1Store.addGuestbook(selfId, friends[0].id, 'Your page feels calm.');
  }
}

export function App() {
  return (
    <JotaiProvider>
      <YourDiaryApp />
    </JotaiProvider>
  );
}
