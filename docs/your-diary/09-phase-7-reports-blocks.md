# 09 — 7단계: 신고·차단 기반

> **상태**: ✅ 완료 (2026-07-24)  
> **핵심**: 가명 전에 **안전 인프라**. 차단은 관계 경계, 신고는 스냅샷으로 삭제 후에도 검토 가능.

---

## 원칙

- 차단 사실은 상대에게 알리지 않음 → 일반 문구: “이 페이지를 볼 수 없어요.”
- 한쪽 차단만으로 양방향 개인 상호작용 차단
- 서클 공지·투표 총합은 유지, Presence/프로필/다이어리/쪽지는 숨김
- 신고 스냅샷은 **서버가 생성** (클라 위조 불가)

---

## 서버 (`015_reports_blocks_moderation.sql`)

| 항목 | 역할 |
|------|------|
| `blocks` | 차단 (멱등 RPC) |
| `has_block_relation` | 양방향 boolean |
| `reports` + `hidden_content` | 신고·개인 숨김 |
| `user_moderation_status` | restricted / suspended |
| `admin_audit_logs` 진화 | 민감 조회·제재 기록 |
| `block_user` / `unblock_user` / `submit_report` | 클라 DML 금지 |
| 관리자 RPC | review / resolve / restrict / suspend / hide |

`014` 이하 마이그레이션은 수정하지 않음.

---

## 클라이언트

- `features/moderation/` — block · report · hide · Presence 필터
- 신고 UI: 사유 + hide_for_me · 서버 스냅샷
- 설정: 차단한 사용자 목록·해제
- 다이어리/Presence: 차단 시 배지·콘텐츠 숨김

---

## 다음

**8단계 가명 게시판** — 이번 신고·차단 RPC를 공통 사용 (새로 만들지 않음)
