# DB Design — 데이터베이스 설계

> **DB**: PostgreSQL (Supabase)
> **버전**: 0.1.0-draft

---

## 1. ERD 개요

```
auth.users (Supabase 관리)
    │
    └── 1:N ── profiles
    │
    └── 1:N ── entries (일기)
                    │
                    └── N:M ── tags (entry_tags 조인)
```

---

## 2. 테이블 정의

### 2.1 `profiles`

사용자 프로필 (auth.users 확장)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK, FK → auth.users.id | 사용자 ID |
| display_name | text | nullable | 표시 이름 |
| avatar_url | text | nullable | 프로필 이미지 URL |
| created_at | timestamptz | default now() | 생성일 |
| updated_at | timestamptz | default now() | 수정일 |

---

### 2.2 `entries`

일기 본문

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK, default gen_random_uuid() | 일기 ID |
| user_id | uuid | FK → auth.users.id, NOT NULL | 작성자 |
| title | text | NOT NULL | 제목 |
| content | text | NOT NULL | 본문 (Markdown 허용) |
| mood | text | nullable | 기분 이모지/코드 |
| entry_date | date | NOT NULL, default CURRENT_DATE | 일기 날짜 |
| created_at | timestamptz | default now() | 생성일 |
| updated_at | timestamptz | default now() | 수정일 |

**인덱스**
- `idx_entries_user_date` ON (user_id, entry_date DESC)
- `idx_entries_user_created` ON (user_id, created_at DESC)

---

### 2.3 `tags`

태그 마스터 (사용자별)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK | 태그 ID |
| user_id | uuid | FK → auth.users.id | 소유자 |
| name | text | NOT NULL | 태그명 |
| created_at | timestamptz | default now() | 생성일 |

**유니크**: `(user_id, name)`

---

### 2.4 `entry_tags`

일기-태그 다대다

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| entry_id | uuid | FK → entries.id ON DELETE CASCADE | 일기 |
| tag_id | uuid | FK → tags.id ON DELETE CASCADE | 태그 |

**PK**: `(entry_id, tag_id)`

---

### 2.5 `entry_images` (P2)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK | 이미지 ID |
| entry_id | uuid | FK → entries.id ON DELETE CASCADE | 일기 |
| storage_path | text | NOT NULL | Supabase Storage 경로 |
| sort_order | int | default 0 | 정렬 순서 |
| created_at | timestamptz | default now() | 업로드일 |

---

## 3. RLS 정책

모든 사용자 데이터 테이블에 RLS 활성화.

```sql
-- entries 예시
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own entries"
  ON entries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

동일 패턴을 `profiles`, `tags`, `entry_tags`, `entry_images`에 적용.

---

## 4. 마이그레이션 순서

1. `profiles`
2. `entries`
3. `tags` + `entry_tags`
4. `entry_images` (P2)

---

## 5. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|-----------|
| 2026-07-02 | 0.1.0 | 초안 작성 |
