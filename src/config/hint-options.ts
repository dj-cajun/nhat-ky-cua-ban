import type { HintData } from '@/types';

export const HEIGHT_RANGES = [
  '155-159',
  '158-162',
  '160-165',
  '163-167',
  '165-170',
  '168-172',
  '170-175',
  '172-176',
  '175-180',
] as const;

export const DEFAULT_HINT_FORM: HintData = {
  gender: 'female',
  heightRange: '160-165',
  mbtiPrefix: 'E',
  commute: 'motorbike',
};
