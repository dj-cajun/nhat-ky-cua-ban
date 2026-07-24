import { atom } from 'jotai';
import type { AppProfile, Circle } from '@/types/circle';

export type V1Page =
  | 'universe'
  | 'circle'
  | 'diary'
  | 'diary-edit'
  | 'circle-create'
  | 'circle-setup'
  | 'invites';

export const v1PageAtom = atom<V1Page>('universe');
export const v1ProfileAtom = atom<AppProfile | null>(null);
export const v1ActiveCircleIdAtom = atom<string | null>(null);
export const v1DiaryOwnerIdAtom = atom<string | null>(null);
export const v1CirclesAtom = atom<Circle[]>([]);
