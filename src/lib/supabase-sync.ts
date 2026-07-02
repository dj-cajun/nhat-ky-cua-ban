import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { encryptHintData, decryptHintData } from '@/lib/hint-crypto';
import type { BoardType, FeedPost, HintData } from '@/types';
import * as localDb from '@/lib/local-db';
import { DEFAULT_POSTS } from '@/lib/seed-data';
import { DEFAULT_STATUS_MESSAGE } from '@/config/app-content';

const SCHOOL_MAP: Record<string, string> = {
  'THPT Marie Curie': 'Ho Chi Minh',
  'THPT Lê Hồng Phong': 'Ho Chi Minh',
  'THPT Nguyễn Thị Minh Khai': 'Ho Chi Minh',
  'THPT Trần Phú': 'Ho Chi Minh',
  'THPT Phổ Thông Năng Khiếu': 'Ho Chi Minh',
  'THPT Bùi Thị Xuân': 'Ho Chi Minh',
  'THPT Gia Định': 'Ho Chi Minh',
  'THPT Lương Thế Vinh': 'Ho Chi Minh',
  // 구버전 호환
  'Marie Curie': 'Ho Chi Minh',
  'Lê Hồng Phong': 'Ho Chi Minh',
};

/** Supabase ↔ localStorage 동기화 */
export async function syncFromRemote(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = getSupabase();
  const profile = localDb.getProfile();
  if (!supabase || !profile?.zaloId) return false;

  try {
    const { data: remoteProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('zalo_id', profile.zaloId)
      .maybeSingle();

    if (!remoteProfile) return false;

    localDb.updateProfile({
      id: remoteProfile.id,
      realName: remoteProfile.real_name,
      surname: remoteProfile.surname,
      dotoriBalance: remoteProfile.dotori_balance,
      visitCountToday: remoteProfile.visit_count_today,
      visitCountTotal: remoteProfile.visit_count_total,
      statusMessage: remoteProfile.status_message ?? '',
    });

    const { data: posts } = await supabase
      .from('posts')
      .select('*')
      .eq('class_id', remoteProfile.class_id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (posts?.length) {
      mergeRemotePosts(posts);
    }

    return true;
  } catch {
    return false;
  }
}

export async function pushProfileToRemote(
  zaloId: string,
  realName: string,
  schoolName: string,
  className: string,
  hint: HintData,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const classId = await ensureClass(schoolName, className);
    if (!classId) return;

    const surname = realName.split(/\s+/)[0] ?? realName;
    const encrypted = encryptHintData(hint);

    await supabase.from('profiles').upsert(
      {
        zalo_id: zaloId,
        real_name: realName,
        surname,
        class_id: classId,
        hint_data: encrypted,
        status_message: DEFAULT_STATUS_MESSAGE,
      },
      { onConflict: 'zalo_id' },
    );
  } catch {
    // 로컬 모드 유지
  }
}

export async function pushPostToRemote(post: FeedPost): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabase();
  const profile = localDb.getProfile();
  if (!supabase || !profile) return;

  try {
    const classId = await resolveClassId(profile.schoolName, profile.className);
    if (!classId) return;

    await supabase.from('posts').insert({
      author_id: profile.id,
      class_id: classId,
      board_type: post.boardType,
      content: post.content,
      has_photo: post.hasPhoto,
      has_video: post.hasVideo,
      has_link: post.hasLink,
      target_user_id: post.targetUserId ?? null,
    });
  } catch {
    // silent
  }
}

export async function pushCommentToRemote(
  postId: string,
  content: string,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabase();
  const profile = localDb.getProfile();
  if (!supabase || !profile) return;

  try {
    await supabase.from('post_comments').insert({
      post_id: postId,
      author_id: profile.id,
      content,
    });
  } catch {
    // silent
  }
}

export async function pushVoteToRemote(
  questionIndex: number,
  selectedUserId: string,
  hintShield: string,
  sessionDate: string,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabase();
  const profile = localDb.getProfile();
  if (!supabase || !profile) return;

  try {
    const classId = await resolveClassId(profile.schoolName, profile.className);
    if (!classId) return;

    const { data: session } = await supabase
      .from('vote_sessions')
      .upsert(
        {
          class_id: classId,
          session_date: sessionDate,
          question_index: questionIndex,
          question_text: `Q${questionIndex}`,
          options: [],
        },
        { onConflict: 'class_id,session_date,question_index' },
      )
      .select('id')
      .single();

    if (session) {
      await supabase.from('vote_responses').upsert({
        session_id: session.id,
        voter_id: profile.id,
        selected_user_id: selectedUserId,
        hint_shield: hintShield,
      });
    }
  } catch {
    // silent
  }
}

async function ensureClass(schoolName: string, className: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const city = SCHOOL_MAP[schoolName] ?? 'Ho Chi Minh';

  let schoolId: string | undefined;
  const { data: existingSchool } = await supabase
    .from('schools')
    .select('id')
    .eq('name', schoolName)
    .maybeSingle();

  if (existingSchool) {
    schoolId = existingSchool.id;
  } else {
    const { data: inserted } = await supabase
      .from('schools')
      .insert({ name: schoolName, city })
      .select('id')
      .single();
    schoolId = inserted?.id;
  }

  if (!schoolId) return null;

  const { data: existingClass } = await supabase
    .from('classes')
    .select('id')
    .eq('school_id', schoolId)
    .eq('name', className)
    .maybeSingle();

  if (existingClass) return existingClass.id;

  const { data: insertedClass } = await supabase
    .from('classes')
    .insert({ school_id: schoolId, name: className })
    .select('id')
    .single();

  return insertedClass?.id ?? null;
}

async function resolveClassId(schoolName: string, className: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data } = await supabase
    .from('classes')
    .select('id, schools!inner(name)')
    .eq('name', className)
    .eq('schools.name', schoolName)
    .maybeSingle();

  return data?.id ?? ensureClass(schoolName, className);
}

function mergeRemotePosts(
  rows: Array<{
    id: string;
    author_id: string;
    board_type: string;
    content: string;
    has_photo: boolean;
    has_video: boolean;
    has_link: boolean;
    created_at: string;
    target_user_id?: string;
  }>,
): void {
  const grouped: Record<BoardType, FeedPost[]> = {
    diary: [],
    school: [],
    vote: [],
    guestbook: [],
  };

  for (const row of rows) {
    const board = row.board_type as BoardType;
    if (!grouped[board]) continue;
    grouped[board].push({
      id: row.id,
      authorId: row.author_id,
      boardType: board,
      content: row.content,
      hasPhoto: row.has_photo,
      hasVideo: row.has_video,
      hasLink: row.has_link,
      createdAt: row.created_at,
      targetUserId: row.target_user_id,
    });
  }

  const local = localDb.getPosts();
  const merged = { ...DEFAULT_POSTS, ...local };
  for (const board of Object.keys(grouped) as BoardType[]) {
    if (grouped[board].length > 0) {
      merged[board] = grouped[board];
    }
  }
  localDb.setPosts(merged);
}

export function getDecryptedHint(): HintData | null {
  const profile = localDb.getProfile();
  if (!profile?.hintEncrypted) return null;
  return decryptHintData(profile.hintEncrypted);
}
