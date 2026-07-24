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
import { db } from '@/lib/db';
import { initDemoSession, isDemoMode } from '@/lib/demo-init';
import { canEnterClassHome, joinFoundingByToken } from '@/lib/class-founding';
import { consumeJoinToken, parseFoundingUrl, peekJoinToken } from '@/lib/founding-params';
import { getOnboardingPrefillFromToken } from '@/lib/founding-router';
import { ensureProfileName } from '@/lib/profile-name';
import { ensureHintSealOnProfile } from '@/lib/supabase-sync';
import { isZaloLoggedIn, loginWithZalo } from '@/lib/zalo-auth';
import {
  handleDevReset,
  isIntroSeen,
  isOnboarded,
  markIntroSeen,
} from '@/lib/session';
import { primeProfanityBlacklist } from '@/lib/profanity-remote';
import * as v1Store from '@/lib/v1-store';
import { useMessages } from '@/i18n';
import { appPageAtom, currentUserAtom, postsAtom, visitorsAtom } from '@/stores/atoms';
import {
  v1CirclesAtom,
  v1DiaryOwnerIdAtom,
  v1PageAtom,
  v1ProfileAtom,
} from '@/stores/v1-atoms';
import { useProfileFont } from '@/hooks/useProfileFont';

type AppStage = 'boot' | 'intro' | 'login' | 'onboarding' | 'founding' | 'app';
type V1Stage = 'boot' | 'signup' | 'app';

function wantsCircleV1(): boolean {
  return new URLSearchParams(window.location.search).get('v1') === '1';
}

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

/** 원래 5층 홈피 (StatusBar · ProfileCard · Calendar · Album · Swipe) */
function HompyApp() {
  const t = useMessages();
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

    if (handleDevReset()) {
      setStage(isDemoMode() ? 'login' : 'intro');
      return;
    }

    void Promise.resolve().then(() => primeProfanityBlacklist());

    // 데모: 인트로 건너뛰고 바로 홈피로
    if (isDemoMode()) {
      void (async () => {
        if (!isZaloLoggedIn()) {
          await loginWithZalo();
        }
        if (!isOnboarded()) {
          await initDemoSession();
        }
        markIntroSeen();
        const next = resolveStage();
        setStage(next);
        if (next === 'app') {
          await ensureHintSealOnProfile();
          hydrateApp();
        }
      })();
      return;
    }

    if (!isIntroSeen()) {
      setStage('intro');
      return;
    }

    const next = resolveStage();
    setStage(next);
    if (next === 'app') {
      void ensureHintSealOnProfile().then(() => hydrateApp());
    }
  }, [hydrateApp]);

  useEffect(() => {
    if (stage !== 'founding') return;
    if (!db.getProfile()) setStage('onboarding');
  }, [stage]);

  if (stage === 'boot') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#faf9f6] text-sm text-slate-500">
        {t.app.loading}
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
      return (
        <div className="flex h-screen items-center justify-center bg-[#faf9f6] text-sm text-slate-500">
          {t.app.loading}
        </div>
      );
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

/** 서클 v1 데모 — ?v1=1 */
function CircleV1App() {
  const [stage, setStage] = useState<V1Stage>('boot');
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
    setProfile(profile);
    setCircles(v1Store.listMyCircles(profile.id));
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
          const profile = v1Store.getSessionProfile();
          if (!profile) return;
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
  const [mode] = useState(() => (wantsCircleV1() ? 'v1' : 'hompy'));
  return (
    <JotaiProvider>
      {mode === 'v1' ? <CircleV1App /> : <HompyApp />}
    </JotaiProvider>
  );
}
