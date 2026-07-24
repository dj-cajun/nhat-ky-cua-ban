import type { FeedPost, PhotoCard, UserProfile, Visitor, HintData } from '@/types';
import * as localDb from '@/lib/local-db';
import { sealHintData } from '@/lib/hint-crypto';
import { extractSurname } from '@/lib/zalo-auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { isRemoteEnabled } from '@/lib/supabase-remote';
import {
  pushProfileToRemote,
  pushPostToRemote,
  pushCommentToRemote,
  pushVoteToRemote,
  pushHintToRemote,
  pushCalendarToRemote,
  pushGiftToRemote,
  syncFromRemote,
  syncClassmatesFromRemote,
} from '@/lib/supabase-sync';

export type { StoredProfile, VoteRecord, Comment, Nomination } from '@/lib/local-db';

/** 통합 데이터 레이어 — Supabase 설정 시 백그라운드 동기화 */
export const db = {
  getProfile: () => localDb.getProfile(),
  initProfile: async (
    zaloId: string,
    realName: string,
    school: string,
    className: string,
    hint: HintData,
  ) => {
    const hintSeal = await sealHintData(hint, extractSurname(realName));
    const profile = localDb.initLocalDb(zaloId, realName, school, className, hintSeal);
    void pushProfileToRemote(zaloId, realName, school, className, hintSeal);
    return profile;
  },
  updateProfile: (patch: Partial<UserProfile>) => localDb.updateProfile(patch),
  updateHint: async (hint: HintData) => {
    const profile = localDb.getProfile();
    if (!profile) return null;
    const hintSeal = await sealHintData(hint, extractSurname(profile.realName));
    const updated = localDb.updateProfile({ hintEncrypted: hintSeal });
    void pushHintToRemote(hintSeal);
    return updated;
  },
  getPosts: () => localDb.getPosts(),
  addPost: (post: Omit<FeedPost, 'id' | 'createdAt'>) => {
    const created = localDb.addPost(post);
    void pushPostToRemote(created);
    return created;
  },
  getVisitors: () => localDb.getVisitors(),
  getTodayVisitors: () => localDb.getTodayVisitors(),
  addVisitor: (v: Visitor) => localDb.addVisitor(v),
  getCalendar: () => localDb.getCalendarEntries(),
  saveCalendar: (date: string, content: string) => {
    localDb.saveCalendarEntry(date, content);
    void pushCalendarToRemote(date, content);
  },
  getPhoto: () => localDb.getPhotoAlbum(),
  getPhotoGallery: () => localDb.getPhotoGallery(),
  savePhotoGallery: (photos: PhotoCard[]) => localDb.savePhotoGallery(photos),
  updatePhotoCard: (id: string, patch: Partial<Pick<PhotoCard, 'imageUrl' | 'caption'>>) =>
    localDb.updatePhotoCard(id, patch),
  addPhotoCard: (imageUrl: string, caption?: string) => localDb.addPhotoCard(imageUrl, caption),
  deletePhotoCard: (id: string) => localDb.deletePhotoCard(id),
  getVotes: () => localDb.getVoteRecords(),
  saveVote: (record: localDb.VoteRecord) => {
    localDb.saveVoteRecord(record);
    void pushVoteToRemote(
      record.questionIndex,
      record.selectedUserId,
      record.hintShield,
      record.date,
    );
  },
  isVoteComplete: () => localDb.isVoteCompleteToday(),
  getComments: localDb.getComments,
  addComment: (postId: string, authorId: string, content: string) => {
    const c = localDb.addComment(postId, authorId, content);
    void pushCommentToRemote(postId, content);
    return c;
  },
  addDotori: localDb.addDotori,
  spendDotori: localDb.spendDotori,
  hasDotoriPurchase: localDb.hasDotoriPurchase,
  markDotoriPurchase: localDb.markDotoriPurchase,
  getGiftInbox: localDb.getGiftInbox,
  openGift: localDb.openGift,
  countDotoriGiftsSentToday: localDb.countDotoriGiftsSentToday,
  recordGiftSent: localDb.recordGiftSent,
  getClassmates: localDb.getClassmates,
  getClassmateById: localDb.getClassmateById,
  getDotoriMissions: localDb.getDotoriMissions,
  completeMission: localDb.completeDotoriMission,
  addNomination: localDb.addNomination,
  getNominations: localDb.getNominationsForUser,
  isBlocked: (userId: string) => localDb.getBlockedUserIds().includes(userId),
  blockUser: localDb.addBlockedUser,
  hasSurnameBlurActive: localDb.hasSurnameBlurActive,
  hasFakeHintActive: localDb.hasFakeHintActive,
  eraseNomination: localDb.eraseNomination,
  canEraseNominationToday: localDb.canEraseNominationToday,
  recordNominationErase: localDb.recordNominationErase,
  activateFakeHint: localDb.activateFakeHint,
  activateSurnameBlur: localDb.activateSurnameBlur,
  pushGiftToRemote,
  isRemote: () => isSupabaseConfigured() && isRemoteEnabled(),
  syncFromRemote,
  syncClassmatesFromRemote,
};
