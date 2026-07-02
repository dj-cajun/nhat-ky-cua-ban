import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { syncFromRemote } from '@/lib/supabase-sync';
import { ensureRemoteAvailable } from '@/lib/supabase-remote';
import { db } from '@/lib/db';
import { ensureProfileName } from '@/lib/profile-name';
import { postsAtom, currentUserAtom } from '@/stores/atoms';

/** 앱 시작 시 Supabase에서 데이터 동기화 (연결 불가 시 로컬 모드 유지) */
export function useDbSync(): void {
  const setPosts = useSetAtom(postsAtom);
  const setUser = useSetAtom(currentUserAtom);

  useEffect(() => {
    void ensureRemoteAvailable().then((available) => {
      if (!available) return;

      void syncFromRemote().then((ok) => {
        if (ok) {
          const profile = db.getProfile();
          if (profile) setUser(ensureProfileName(profile));
          setPosts(db.getPosts());
        }
      });
    });
  }, [setPosts, setUser]);
}
