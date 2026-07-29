import { useEffect } from 'react';
import { useAtomValue } from 'jotai';
import type { ProfileFontId } from '@/types/dotori';
import { currentUserAtom } from '@/stores/atoms';

export function useProfileFont() {
  const user = useAtomValue(currentUserAtom);
  const fontId: ProfileFontId = user.fontId ?? 'playpen';

  useEffect(() => {
    document.documentElement.dataset.font = fontId;
  }, [fontId]);

  return fontId;
}
