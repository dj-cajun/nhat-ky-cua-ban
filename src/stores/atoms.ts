import { atom } from 'jotai';
import type { BoardType, UserProfile, ViewMode } from '@/types';
import { mockCurrentUser, mockStrangerUser } from '@/lib/mock-data';

export const viewModeAtom = atom<ViewMode>('my');

export const currentUserAtom = atom<UserProfile>(mockCurrentUser);

export const strangerUserAtom = atom<UserProfile>(mockStrangerUser);

export const activeBoardAtom = atom<BoardType>('school');

export const cardIndexAtom = atom(0);

export const voteLockAtom = atom(false);

export const dotoriBalanceAtom = atom((get) => get(currentUserAtom).dotoriBalance);

export const displayUserAtom = atom((get) => {
  const mode = get(viewModeAtom);
  return mode === 'my' ? get(currentUserAtom) : get(strangerUserAtom);
});
