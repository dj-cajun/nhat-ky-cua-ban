import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { syncFromRemote } from '@/lib/supabase-sync';
import { db } from '@/lib/db';
import { postsAtom, currentUserAtom } from '@/stores/atoms';

/** 앱 시작 시 Supabase에서 데이터 동기화 */
export function useDbSync(): void {
  const setPosts = useSetAtom(postsAtom);
  const setUser = useSetAtom(currentUserAtom);

  useEffect(() => {
    if (!db.isRemote()) return;

    void syncFromRemote().then((ok) => {
      if (ok) {
        const profile = db.getProfile();
        if (profile) setUser(profile);
        setPosts(db.getPosts());
      }
    });
  }, [setPosts, setUser]);
}
