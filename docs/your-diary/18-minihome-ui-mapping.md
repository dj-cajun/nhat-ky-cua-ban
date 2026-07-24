# 18 — 미니홈피 UI → Your Diary 매핑

> **상태**: 현행  
> **최종 갱신**: 2026-07-24

---

## 원칙

옛 제품 **기능**(학교·Zalo·도토리·TODAY/TOTAL·수사)은 버린다.  
옛 미니홈피 **인터페이스**(파스텔·프로필·캘린더·앨범·방명록 분위기)는 디자인 원본으로 살린다.

참고 스냅샷: `legacy-minihome-reference/` (`443d8b3^`, revert 금지)

---

## 매핑

| 옛 미니홈피 | 현재 Your Diary |
|-------------|-----------------|
| 홈 레이아웃 (`cy-shell` / `cy-canvas`) | `DiaryHomePage` |
| 프로필 카드 | 기분 · 10자/상태 · 서클 뱃지 |
| 사진첩 | 미니 앨범 패널 (날짜별 사진 자리) |
| 캘린더 | 주간 다이어리 10자 |
| 방명록 | 방명록 리스트 · 작성 |
| 게시판 영역 | 가명 게시판 링크 (서클) |
| 음악 영역 | Spotify 오늘의 음악 카드 자리 |
| 친구 워프 | 서클/디렉터리 멤버 방문 스트립 |
| StatusBar TODAY/TOTAL · Dotori | **제거** |
| Investigation · Gift · VoteLock | **제거** |

---

## 런타임

- 웹 `/` = Your Diary (가입 → 우주 → **미니홈피 다이어리** `DiaryHomePage`)
- 모바일: 인트로 → My Universe → 구체 탭 → **`DiaryHompyHome`** (`mobile/src/features/diary-home/`) → `/diary/[userId]`
- 학교/Zalo HompyApp은 기본 마운트하지 않음
