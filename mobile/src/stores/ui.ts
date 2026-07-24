import { create } from 'zustand';
import type { DiaryMood, DiaryVisibilityMode } from '@/types/domain';

interface UiState {
  selectedCircleId: string | null;
  diaryDraft: {
    mood?: DiaryMood;
    tenCharText: string;
    shortText: string;
    visibilityMode: DiaryVisibilityMode;
    circleIds: string[];
  };
  onboardingStep: number;
  setSelectedCircleId: (id: string | null) => void;
  setDiaryDraft: (patch: Partial<UiState['diaryDraft']>) => void;
  resetDiaryDraft: () => void;
  setOnboardingStep: (step: number) => void;
}

const emptyDraft: UiState['diaryDraft'] = {
  tenCharText: '',
  shortText: '',
  visibilityMode: 'private',
  circleIds: [],
};

export const useUiStore = create<UiState>((set) => ({
  selectedCircleId: null,
  diaryDraft: emptyDraft,
  onboardingStep: 0,
  setSelectedCircleId: (id) => set({ selectedCircleId: id }),
  setDiaryDraft: (patch) =>
    set((s) => ({ diaryDraft: { ...s.diaryDraft, ...patch } })),
  resetDiaryDraft: () => set({ diaryDraft: emptyDraft }),
  setOnboardingStep: (step) => set({ onboardingStep: step }),
}));
