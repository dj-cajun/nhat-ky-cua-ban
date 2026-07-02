import type { FeedPost, UserProfile, Visitor, HintData } from '@/types';
import * as localDb from '@/lib/local-db';
import { isSupabaseConfigured } from '@/lib/supabase';

/** 통합 데이터 레이어 — Supabase 미설정 시 localStorage 사용 */
export const db = {
  getProfile: () => localDb.getProfile(),
  initProfile: (
    zaloId: string,
    realName: string,
    school: string,
    className: string,
    hint: HintData,
  ) => localDb.initLocalDb(zaloId, realName, school, className, hint),
  updateProfile: (patch: Partial<UserProfile>) => localDb.updateProfile(patch),
  getPosts: () => localDb.getPosts(),
  addPost: (post: Omit<FeedPost, 'id' | 'createdAt'>) => localDb.addPost(post),
  getVisitors: () => localDb.getVisitors(),
  addVisitor: (v: Visitor) => localDb.addVisitor(v),
  getCalendar: () => localDb.getCalendarEntries(),
  saveCalendar: (date: string, content: string) => localDb.saveCalendarEntry(date, content),
  getPhoto: () => localDb.getPhotoAlbum(),
  saveCaption: (caption: string) => localDb.savePhotoCaption(caption),
  getVotes: () => localDb.getVoteRecords(),
  saveVote: localDb.saveVoteRecord,
  isVoteComplete: () => localDb.isVoteCompleteToday(),
  getComments: localDb.getComments,
  addComment: localDb.addComment,
  addDotori: localDb.addDotori,
  getClassmates: localDb.getClassmates,
  getClassmateById: localDb.getClassmateById,
  getDotoriMissions: localDb.getDotoriMissions,
  completeMission: localDb.completeDotoriMission,
  isRemote: () => isSupabaseConfigured(),
};
