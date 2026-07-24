# 11 — 9단계: 실명·가명 쪽지

> **상태**: ✅ 완료 (2026-07-24)  
> **핵심**: 쪽지는 **채팅이 아니라 한 장의 편지**. 읽음·타이핑·연속 대화방 없음.

---

## 원칙

- 같은 서클 활성 멤버끼리만 · 미니홈피에서 의도적 진입
- 실명 / 가명 발송 (가명은 서클 고정 가명 재사용)
- 텍스트만 · 링크/멘션 금지
- 읽음 시각은 수신자 내부 상태만 · 발신자 비공개
- 가명 수신은 계정 설정에서 별도 OFF
- 차단·신고·숨김은 7단계 API 재사용
- Realtime / Presence / “입력 중” 연결 금지

---

## 서버 (`017_private_notes.sql`)

| RPC | 역할 |
|-----|------|
| `send_named_message` / `send_alias_message` | 발송 · 강한 빈도 제한 |
| `reply_to_private_message` | 상대 ID 비노출 답장 |
| `get_received_messages` / `get_sent_messages` | 커서 목록 |
| `open_private_message` | 수신자 opened_at (발신 비공개) |
| `hide_private_message` | 개인 숨김 |
| `block_private_message_sender` | 실명 비공개 차단 |
| `get/update_my_message_preferences` | 실명·가명 수신 ON/OFF |
| `resolve_private_message_sender` | 신고 사건 + 운영자 + 감사 로그 |

`private_messages` · `private_message_user_states` · `message_preferences` 클라이언트 직접 접근 REVOKE.  
`016` 이하 무수정. 레거시 `direct_messages`도 deny.

---

## 클라이언트

- `features/private-messages/`
- `/messages` 받은·보낸 편지함 · `/messages/compose` · `/messages/preferences`
- 미니홈피: Leave a note
- Alerts 탭에서 Notes 링크

---

## 다음

**10단계 Spotify 오늘의 음악 카드** — 미니홈피 감성·표현
