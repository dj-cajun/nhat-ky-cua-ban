import {
  blockUser as localBlock,
  isBlockedBetween,
  listBlocks,
  unblockUser as localUnblock,
} from '@/features/local/repository';

export async function blockUser(actorId: string, targetUserId: string): Promise<void> {
  return localBlock(actorId, targetUserId);
}

export async function unblockUser(actorId: string, targetUserId: string): Promise<void> {
  return localUnblock(actorId, targetUserId);
}

export async function listBlockedUserIds(actorId: string): Promise<string[]> {
  return listBlocks(actorId);
}

export async function hasBlockRelation(a: string, b: string): Promise<boolean> {
  return isBlockedBetween(a, b);
}
