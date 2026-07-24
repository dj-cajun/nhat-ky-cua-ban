# 06 — 5단계: Realtime 초록 배지

> **상태**: 🔄 구현 (2026-07-24)  
> **출처**: 5단계 개발 지시서  
> **의미**: 초록 = “지금 이 서클 공간에 함께 있음” (앱 전체 온라인 ≠)

---

## 하지 않는 것

- last_seen / 접속 횟수 / 체류 시간 / 방문 로그 테이블  
- 앱 전체·다른 서클 온라인  
- 입장·퇴장 푸시·알림  
- Presence payload에 이름·이메일·아바타·기기정보  

---

## 보안

1. **private channel만** (`config.private: true`)  
2. Dashboard: Allow public access **비활성** (staging 먼저)  
3. 토픽: `circle:{uuid}` 만  
4. `realtime.messages` RLS — Presence SELECT/INSERT → `is_active_circle_member_from_topic`  
5. 마이그레이션 **`012`** (007·008·010·011 미수정)

---

## 클라이언트

| 경로 | 역할 |
|------|------|
| `mobile/src/features/presence/` | types · topic · normalize · service · store · hook |
| 서클 화면만 구독 | 현재 연 서클 1개 |
| AppState / unmount | untrack + removeChannel |

Supabase 미설정 시: 인메모리 폴백 (데모). DB에 presence 쓰지 않음.

---

## 배지

- **초록**: Presence 세션 ≥ 1 (다중 기기 = 점 하나)  
- **주홍**: 6단계 (공지 응답 후). 5단계 payload는 `present`만  

---

## 테스트

- unit: topic 파싱, presence normalize, multi-session  
- security: 비멤버 토픽·변조 토픽 (미러 + SQL 스케치)  

완료 조건은 `roadmap.md` 체크리스트.
