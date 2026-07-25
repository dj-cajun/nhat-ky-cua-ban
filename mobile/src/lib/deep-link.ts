import { AppError } from '@/types/domain';
import {
  getCircle,
  getSessionProfile,
  isBlockedBetween,
  isCircleMember,
} from '@/features/local/repository';

export type DeepLinkKind =
  | 'circle'
  | 'notice'
  | 'join'
  | 'diary'
  | 'message'
  | 'report'
  | 'recommendation';

export type DeepLinkTarget = {
  kind: DeepLinkKind;
  circleId?: string;
  userId?: string;
  messageId?: string;
  postId?: string;
  recommendationId?: string;
  reportId?: string;
};

export type DeepLinkResult =
  | { ok: true; href: string }
  | { ok: false; code: 'AUTH_REQUIRED' | 'FORBIDDEN' | 'NOT_FOUND'; message: string };

/**
 * Resolve deep links with session → permission → existence checks.
 * Never render destination data from URL alone.
 */
export async function resolveDeepLink(target: DeepLinkTarget): Promise<DeepLinkResult> {
  const me = await getSessionProfile();
  if (!me) {
    return {
      ok: false,
      code: 'AUTH_REQUIRED',
      message: 'Please sign in.',
    };
  }

  try {
    switch (target.kind) {
      case 'circle':
      case 'notice':
      case 'join': {
        if (!target.circleId) throw new AppError('NOT_FOUND', 'Missing circle.');
        const circle = await getCircle(target.circleId);
        if (!circle) throw new AppError('NOT_FOUND', 'This content is no longer available.');
        const member = await isCircleMember(target.circleId, me.id);
        if (!member && target.kind !== 'join') {
          throw new AppError('FORBIDDEN', "You can't open this.");
        }
        if (target.kind === 'notice') {
          return { ok: true, href: `/circles/${target.circleId}/notice` };
        }
        if (target.kind === 'join') {
          return { ok: true, href: `/circles/${target.circleId}/join` };
        }
        return { ok: true, href: `/circles/${target.circleId}` };
      }
      case 'diary': {
        if (!target.userId) throw new AppError('NOT_FOUND', 'Missing diary.');
        if (await isBlockedBetween(me.id, target.userId)) {
          throw new AppError('FORBIDDEN', "You can't view this page.");
        }
        return { ok: true, href: `/diary/${target.userId}` };
      }
      case 'message': {
        if (!target.messageId) throw new AppError('NOT_FOUND', 'Missing note.');
        return { ok: true, href: `/messages/${target.messageId}` };
      }
      case 'recommendation': {
        if (!target.recommendationId) {
          throw new AppError('NOT_FOUND', 'Missing recommendation.');
        }
        return { ok: true, href: `/recommendations/${target.recommendationId}` };
      }
      case 'report': {
        return { ok: true, href: '/ops/reports' };
      }
      default:
        throw new AppError('NOT_FOUND', 'This content is no longer available.');
    }
  } catch (e) {
    if (e instanceof AppError) {
      return {
        ok: false,
        code: e.code === 'FORBIDDEN' || e.code === 'AUTH_REQUIRED' ? e.code : 'NOT_FOUND',
        message:
          e.code === 'FORBIDDEN'
            ? "You can't open this."
            : 'This content is no longer available.',
      };
    }
    return {
      ok: false,
      code: 'NOT_FOUND',
      message: 'This content is no longer available.',
    };
  }
}
