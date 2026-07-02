import { atom } from 'jotai';
import type { BoardType, FeedPost, UserProfile, ViewMode, Visitor } from '@/types';
import { mockCurrentUser, mockStrangerUser } from '@/lib/mock-data';
import { db } from '@/lib/db';

export type AppPage = 'onboarding' | 'home' | 'dotori';

export const appPageAtom = atom<AppPage>('home');
export const viewModeAtom = atom<ViewMode>('my');
export const currentUserAtom = atom<UserProfile>(mockCurrentUser);
export const strangerUserAtom = atom<UserProfile>(mockStrangerUser);
export const activeBoardAtom = atom<BoardType>('school');
export const cardIndexAtom = atom(0);
export const voteLockAtom = atom(false);
export const showVoteOverlayAtom = atom(false);
export const postsAtom = atom<Record<BoardType, FeedPost[]>>(db.getPosts());
export const visitorsAtom = atom<Visitor[]>(db.getVisitors());

export const dotoriBalanceAtom = atom((get) => get(currentUserAtom).dotoriBalance);

export const displayUserAtom = atom((get) => {
  const mode = get(viewModeAtom);
  return mode === 'my' ? get(currentUserAtom) : get(strangerUserAtom);
});

export const strangerHostIdAtom = atom<string | null>(null);
