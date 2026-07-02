import type { FeedPost, PhotoCard, UserProfile, Visitor, HintData } from '@/types';
import * as localDb from '@/lib/local-db';
import { isSupabaseConfigured } from '@/lib/supabase';
import { isRemoteEnabled } from '@/lib/supabase-remote';
import {
  pushProfileToRemote,
  pushPostToRemote,
  pushCommentToRemote,
  pushVoteToRemote,
  syncFromRemote,
} from '@/lib/supabase-sync';

export type { StoredProfile, VoteRecord, Comment, Nomination } from '@/lib/local-db';

/** 통합 데이터 레이어 — Supabase 설정 시 백그라운드 동기화 */
export const db = {
  getProfile: () => localDb.getProfile(),
  initProfile: (
    zaloId: string,
    realName: string,
    school: string,
    className: string,
    hint: HintData,
  ) => {
    const profile = localDb.initLocalDb(zaloId, realName, school, className, hint);
    void pushProfileToRemote(zaloId, realName, school, className, hint);
    return profile;
  },
  updateProfile: (patch: Partial<UserProfile>) => localDb.updateProfile(patch),
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
  saveCalendar: (date: string, content: string) => localDb.saveCalendarEntry(date, content),
  getPhoto: () => localDb.getPhotoAlbum(),
  getPhotoGallery: () => localDb.getPhotoGallery(),
  savePhotoGallery: (photos: PhotoCard[]) => localDb.savePhotoGallery(photos),
  updatePhotoCard: (id: string, patch: Partial<Pick<PhotoCard, 'imageUrl' | 'caption'>>) =>
    localDb.updatePhotoCard(id, patch),
  addPhotoCard: (imageUrl: string, caption?: string) => localDb.addPhotoCard(imageUrl, caption),
  saveCaption: (caption: string) => localDb.savePhotoCaption(caption),
  savePhoto: (imageUrl: string) => localDb.savePhotoImage(imageUrl),
  savePhotoAlbum: (imageUrl: string, caption: string) => localDb.savePhotoAlbum(imageUrl, caption),
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
  getClassmates: localDb.getClassmates,
  getClassmateById: localDb.getClassmateById,
  getDotoriMissions: localDb.getDotoriMissions,
  completeMission: localDb.completeDotoriMission,
  addNomination: localDb.addNomination,
  getNominations: localDb.getNominationsForUser,
  isRemote: () => isSupabaseConfigured() && isRemoteEnabled(),
  syncFromRemote,
};
