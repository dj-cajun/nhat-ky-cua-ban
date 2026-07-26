# 24 — Phase E3 Structural Swap

> **상태**: 구현 · 제품 화면 구조 교체 (실데이터/인가 연결은 E5)  
> **선행**: E2 승인 (E2.1·E2.2)

## 목표

프로토타입(`/prototype/e2`)의 네 공간 구조를 **실제 앱 경로**에 반영한다.

| 공간 | 제품 경로 | E3 구조 |
|------|-----------|---------|
| 우주 | `/(tabs)/universe` → `FallbackUniverse` | 중앙 나 + 크기·거리 계층 · close-3 로컬 수동 |
| 서클 | `/circles/[id]/graph` | 분위기 룸 · 친구 오브 · notice/board 코너 |
| 친구/내 다이어리 | `/diary/[userId]` → `DiaryHompyHome` | 장면 우선 · friendWindow / myDesk |

## Close-3 규칙 (유지)

- AsyncStorage `universe.closeFriendIds.v1` — **뷰어 전용**
- 먼 점 포커스 → `keep near me (private)`
- 가까운 오브 길게 눌러 해제
- 자동 친밀도·알림·서버 동기화 **없음** (E5 이전)

## 비범위

- E4 모션 폴리시
- E5 공지/편지/달력/토마토/앨범 실기능 고도화
- migration / RLS / 서버 close-friend 테이블

## 완료 신호

- 우주가 동등 원형 메뉴가 아니라 관계 거리감으로 읽힘
- 서클이 채팅 목록이 아니라 “누구의 하루로 갈지” 룸으로 읽힘
- 다이어리가 파스텔 카드 그리드가 아니라 오늘 장면으로 읽힘
