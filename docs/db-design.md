# DB Design — 데이터베이스 설계

> **DB**: PostgreSQL (Supabase)
> **버전**: 1.0.0

---

## 1. ERD 개요

```
schools ──1:N── classes ──1:N── profiles
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
    calendar_entries    photo_albums          posts
         │                    │                    │
         │                    │              post_comments
    visitors ────────────────┘              vote_sessions
                                                   │
                                              vote_responses
```

---

## 2. 테이블 정의

### 2.1 `schools`

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK | 학교 ID |
| name | text | NOT NULL | 학교명 (예: Marie Curie) |
| city | text | NOT NULL | 도시 |

### 2.2 `classes`

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK | 학급 ID |
| school_id | uuid | FK → schools | 학교 |
| name | text | NOT NULL | 학급명 (예: Lớp 11A) |

### 2.3 `profiles`

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK | 사용자 ID (Zalo uid 매핑) |
| zalo_id | text | UNIQUE, NOT NULL | Zalo 사용자 ID |
| real_name | text | NOT NULL | 실명 |
| surname | text | NOT NULL | 성씨 (Họ) |
| class_id | uuid | FK → classes | 소속 학급 |
| avatar_url | text | nullable | 프로필 사진 |
| status_message | text | nullable | 상태 메시지 |
| hint_data | jsonb | NOT NULL | 암호화된 힌트 (성별, 키, MBTI, 등교수단) |
| dotori_balance | int | default 0 | 도토리 잔액 |
| visit_count_today | int | default 0 | 오늘 방문자 수 |
| visit_count_total | int | default 0 | 총 방문자 수 |
| created_at | timestamptz | default now() | |

### 2.4 `calendar_entries`

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK | |
| user_id | uuid | FK → profiles | |
| entry_date | date | NOT NULL | |
| content | varchar(5) | NOT NULL | 최대 5자 일기 |

**유니크**: `(user_id, entry_date)`

### 2.5 `photo_albums`

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK | |
| user_id | uuid | FK → profiles | |
| storage_path | text | NOT NULL | 사진 경로 |
| caption | varchar(10) | nullable | 최대 10자 캡션 |

### 2.6 `posts`

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK | |
| author_id | uuid | FK → profiles | 작성자 (피드엔 미노출) |
| class_id | uuid | FK → classes | |
| board_type | text | NOT NULL | diary\|school\|vote\|guestbook |
| content | text | NOT NULL | |
| has_photo | bool | default false | |
| has_video | bool | default false | |
| has_link | bool | default false | |
| media_urls | jsonb | nullable | 상세 진입 시만 노출 |
| created_at | timestamptz | default now() | |

### 2.7 `post_comments`

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK | |
| post_id | uuid | FK → posts | |
| author_id | uuid | FK → profiles | |
| content | text | NOT NULL | |
| created_at | timestamptz | default now() | |

### 2.8 `visitors`

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK | |
| host_id | uuid | FK → profiles | 방 주인 |
| visitor_id | uuid | FK → profiles | 방문자 |
| visited_at | timestamptz | default now() | |

### 2.9 `vote_sessions`

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK | |
| class_id | uuid | FK → classes | |
| session_date | date | NOT NULL | |
| question_index | int | NOT NULL | 1~12 |
| question_text | text | NOT NULL | |
| options | jsonb | NOT NULL | 실명 4지선다 |

### 2.10 `vote_responses`

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK | |
| session_id | uuid | FK → vote_sessions | |
| voter_id | uuid | FK → profiles | |
| selected_user_id | uuid | FK → profiles | |
| hint_shield | text | NOT NULL | surname\|height\|gender\|commute |
| created_at | timestamptz | default now() | |

### 2.11 `profanity_blacklist`

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK | |
| word | text | NOT NULL | 정규화된 금지 어근 |
| language | text | NOT NULL | vi\|ko |

---

## 3. RLS 정책

- `profiles`: 본인 전체 CRUD, 같은 반은 surname·avatar만 (워프용)
- `posts`, `post_comments`: 같은 `class_id` 읽기, 본인 작성
- `calendar_entries`, `photo_albums`: 본인 CRUD, 타인 읽기(워프 시)
- `vote_responses`: 본인 작성, 지목 대상은 21:00 알림용 조회

---

## 4. Realtime 채널

- `class:{class_id}:posts` — 새 글
- `class:{class_id}:members` — 신규 가입

---

## 5. 마이그레이션 순서

1. schools, classes
2. profiles
3. calendar_entries, photo_albums
4. posts, post_comments
5. visitors
6. vote_sessions, vote_responses
7. profanity_blacklist

---

## 6. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|-----------|
| 2026-07-02 | 0.1.0 | 개인 일기 초안 |
| 2026-07-02 | 1.0.0 | Zalo 익명 소셜 스키마 |
