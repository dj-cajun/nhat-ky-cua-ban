# 10 — 8단계: 가명 게시판

> **상태**: ✅ 완료 (2026-07-24)  
> **핵심**: 가명은 **서클 안**에서만. 사용자는 가명만 보고, 서버는 신고 시 책임 추적 가능.

---

## 원칙

- 서클별 **고정 가명** (서버 생성, 사용자 지정 불가)
- 텍스트만 · 링크/이미지/멘션 금지
- 원본 테이블 직접 SELECT 금지 · RPC만
- 차단 관계는 **서버 조회에서** 제외
- 신고·숨김·차단은 **7단계 공통 API** 재사용
- “완전 익명”이라고 쓰지 않음
- 서클 중심은 멤버·공지 / 가명 게시판은 **보조 미리보기(최대 3)**

---

## 서버 (`016_anonymous_circle_board.sql`)

| RPC | 역할 |
|-----|------|
| `get_or_create_circle_alias` | 서클별 고정 가명 |
| `create_anonymous_post` | 작성 · 빈도·본문 검증 · idempotent `client_request_id` |
| `get_anonymous_circle_posts` | 커서 목록 · 차단/숨김 필터 · `isMine` |
| `get_anonymous_circle_preview` | 홈 미리보기 (≤3) |
| `delete_anonymous_post` | 작성자 soft delete (`deleted`) |
| `block_anonymous_post_author` | 실명 비공개 차단 |
| `resolve_anonymous_author` | 신고 사건 + 앱 운영자만 · 감사 로그 |

`015` 이하 무수정. `anonymous_posts` / `circle_aliases` 클라이언트 REVOKE.

신고 스냅샷(`build_report_snapshot`)에 `authorUserId`·`aliasName`·본문 보존. 일반 신고자에게는 작성자 ID 미반환.

---

## 클라이언트

- `mobile/src/features/anonymous-board/`
- 서클 홈: 멤버·공지 **아래** 최근 1~3개 미리보기 +「View board」
- 게시판: 목록 · 작성 · 상대 시각 · 메뉴(신고/숨김/차단/삭제)
- 작성 안내: 가명 노출 + 안전 신고 시 계정 확인 가능 (완전 익명 표현 금지)
- Realtime / 좋아요 / 초 단위 시각 / Presence 연동 없음

---

## 테스트

- `anonymous-board/__tests__/` — validation · local security mirror
- `tests/security/anonymous-*.test.ts` — leakage · alias tampering · block · rate · resolve

---

## 다음

**9단계 실명·가명 쪽지** — 완료 → [11-phase-9-private-messages.md](./11-phase-9-private-messages.md)  
다음은 **10단계 Spotify 오늘의 음악 카드**.
