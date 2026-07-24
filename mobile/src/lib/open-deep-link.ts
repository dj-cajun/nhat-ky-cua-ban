import { router } from 'expo-router';
import { resolveDeepLink, type DeepLinkTarget } from '@/lib/deep-link';
import { getMessages } from '@/i18n';
export type OpenDeepLinkResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Open a notification / inbox deep link only after session → permission → existence checks.
 */
export async function openDeepLink(target: DeepLinkTarget): Promise<OpenDeepLinkResult> {
  const result = await resolveDeepLink(target);
  if (!result.ok) {
    return {
      ok: false,
      message:
        result.code === 'AUTH_REQUIRED'
          ? getMessages().errors.auth
          : result.code === 'FORBIDDEN'
            ? getMessages().errors.forbidden
            : getMessages().errors.notFound,
    };
  }
  router.push(result.href as `/circles/${string}`);
  return { ok: true };
}
