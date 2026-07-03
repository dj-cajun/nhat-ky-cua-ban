import { getSupabase } from '@/lib/supabase';
import { ensureRemoteAvailable, isUuid } from '@/lib/supabase-remote';
import { migrateLegacyHintSeal, parseHintSeal, getShieldLabel } from '@/lib/hint-crypto';
import type { BoardType, FeedPost, HintShield } from '@/types';
import * as localDb from '@/lib/local-db';
import { DEFAULT_POSTS } from '@/lib/seed-data';
import { DEFAULT_STATUS_MESSAGE } from '@/config/app-content';
import { isPlaceholderZaloName } from '@/lib/zalo-auth';

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
  if (!(await ensureRemoteAvailable())) return false;
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
      realName: remoteProfile.real_name?.trim() && !isPlaceholderZaloName(remoteProfile.real_name)
        ? remoteProfile.real_name
        : profile.realName,
      surname: remoteProfile.surname?.trim() || profile.surname,
      dotoriBalance: remoteProfile.dotori_balance,
      visitCountToday: remoteProfile.visit_count_today,
      visitCountTotal: remoteProfile.visit_count_total,
      statusMessage: remoteProfile.status_message ?? '',
      remoteClassId: remoteProfile.class_id,
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

    await syncClassmatesFromRemote(remoteProfile.class_id, profile.schoolName, profile.className);

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
  hintSeal: string,
): Promise<void> {
  if (!(await ensureRemoteAvailable())) return;
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const classId = await ensureClass(schoolName, className);
    if (!classId) return;

    const surname = realName.split(/\s+/)[0] ?? realName;

    await supabase.from('profiles').upsert(
      {
        zalo_id: zaloId,
        real_name: realName,
        surname,
        class_id: classId,
        hint_data: hintSeal,
        status_message: DEFAULT_STATUS_MESSAGE,
      },
      { onConflict: 'zalo_id' },
    );

    const { data: remoteProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('zalo_id', zaloId)
      .maybeSingle();

    if (remoteProfile?.id) {
      localDb.updateProfile({ id: remoteProfile.id, remoteClassId: classId });
      await provisionRemoteHome(remoteProfile.id);
    } else {
      localDb.updateProfile({ remoteClassId: classId });
    }
  } catch {
    // 로컬 모드 유지
  }
}

export async function pushPostToRemote(post: FeedPost): Promise<void> {
  if (!(await ensureRemoteAvailable())) return;
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
  if (!(await ensureRemoteAvailable())) return;
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
  if (!(await ensureRemoteAvailable())) return;
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

export async function pushHintToRemote(hintSeal: string): Promise<void> {
  if (!(await ensureRemoteAvailable())) return;
  const supabase = getSupabase();
  const profile = localDb.getProfile();
  if (!supabase || !profile?.zaloId) return;

  try {
    await supabase
      .from('profiles')
      .update({ hint_data: hintSeal, updated_at: new Date().toISOString() })
      .eq('zalo_id', profile.zaloId);
  } catch {
    // silent
  }
}

export async function pushCalendarToRemote(date: string, content: string): Promise<void> {
  if (!(await ensureRemoteAvailable())) return;
  const supabase = getSupabase();
  const profile = localDb.getProfile();
  if (!supabase || !profile || !isUuid(profile.id)) return;

  try {
    if (!content.trim()) {
      await supabase
        .from('calendar_entries')
        .delete()
        .eq('user_id', profile.id)
        .eq('entry_date', date);
      return;
    }

    await supabase.from('calendar_entries').upsert(
      {
        user_id: profile.id,
        entry_date: date,
        content: content.trim().slice(0, 5),
      },
      { onConflict: 'user_id,entry_date' },
    );
  } catch {
    // silent
  }
}

async function provisionRemoteHome(userId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !isUuid(userId)) return;

  try {
    const calendar = localDb.getCalendarEntries();
    if (calendar.length > 0) {
      await supabase.from('calendar_entries').upsert(
        calendar.map((entry) => ({
          user_id: userId,
          entry_date: entry.date,
          content: entry.content.slice(0, 5),
        })),
        { onConflict: 'user_id,entry_date' },
      );
    }

    const photo = localDb.getPhotoAlbum();
    const { count } = await supabase
      .from('photo_albums')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (!count) {
      await supabase.from('photo_albums').insert({
        user_id: userId,
        storage_path: photo.imageUrl,
        caption: photo.caption.slice(0, 10),
      });
    }
  } catch {
    // silent
  }
}

export async function syncClassmatesFromRemote(
  classId: string,
  schoolName: string,
  className: string,
): Promise<void> {
  if (!(await ensureRemoteAvailable())) return;
  const supabase = getSupabase();
  if (!supabase || !isUuid(classId)) return;

  try {
    const { data: rows } = await supabase
      .from('profiles')
      .select(
        'id, real_name, surname, status_message, hint_data, dotori_balance, visit_count_today, visit_count_total, surname_blur_until',
      )
      .eq('class_id', classId)
      .limit(40);

    if (!rows?.length) return;

    const profile = localDb.getProfile();
    localDb.setRemoteClassmates(
      rows
        .filter((row) => row.id !== profile?.id)
        .map((row) => ({
          id: row.id,
          realName: row.real_name,
          surname: row.surname,
          schoolName,
          className,
          statusMessage: row.status_message ?? '',
          hintEncrypted: row.hint_data,
          dotoriBalance: row.dotori_balance ?? 0,
          visitCountToday: row.visit_count_today ?? 0,
          visitCountTotal: row.visit_count_total ?? 0,
          surnameBlurUntil: row.surname_blur_until ?? undefined,
        })),
    );
  } catch {
    // silent
  }
}

export async function pushGiftToRemote(
  receiverId: string,
  giftType: 'dotori' | 'deco' | 'theme' | 'sticker' | 'mystery',
  amount: number,
  itemId: string | null,
  message: string,
  isAnonymous: boolean,
): Promise<void> {
  if (!(await ensureRemoteAvailable())) return;
  const supabase = getSupabase();
  const profile = localDb.getProfile();
  if (!supabase || !profile || !isUuid(profile.id) || !isUuid(receiverId)) return;

  try {
    await supabase.from('dotori_gifts').insert({
      sender_id: profile.id,
      receiver_id: receiverId,
      gift_type: giftType,
      amount: amount || null,
      item_id: itemId,
      is_anonymous: isAnonymous,
      message: message.slice(0, 10),
    });
  } catch {
    // table may not exist yet
  }
}

async function ensureClass(schoolName: string, className: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
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
  } catch {
    return null;
  }
}

async function resolveClassId(schoolName: string, className: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data } = await supabase
      .from('classes')
      .select('id, schools!inner(name)')
      .eq('name', className)
      .eq('schools.name', schoolName)
      .maybeSingle();

    return data?.id ?? ensureClass(schoolName, className);
  } catch {
    return null;
  }
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

export async function ensureHintSealOnProfile(): Promise<void> {
  const profile = localDb.getProfile();
  if (!profile?.hintEncrypted) return;
  if (parseHintSeal(profile.hintEncrypted)) return;

  const migrated = await migrateLegacyHintSeal(profile.hintEncrypted, profile.surname);
  if (migrated) {
    localDb.updateProfile({ hintEncrypted: migrated });
  }
}

function getHintSeal() {
  const profile = localDb.getProfile();
  if (!profile?.hintEncrypted) return null;
  return parseHintSeal(profile.hintEncrypted);
}

export function getHintShieldText(shield: HintShield): string | null {
  const seal = getHintSeal();
  return seal ? getShieldLabel(seal, shield) : null;
}
