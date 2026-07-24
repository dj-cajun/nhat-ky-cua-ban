# 18 — 미니홈피 UI → Your Diary 매핑

> **상태**: 현행  
> **최종 갱신**: 2026-07-24

---

## 원칙

옛 제품 **기능**(학교·Zalo·도토리·TODAY/TOTAL·수사)은 버린다.  
옛 미니홈피 **인터페이스**(파스텔·`sk-outline` 색연필 테두리·프로필·캘린더·앨범·방명록 분위기)는 디자인 원본으로 살린다.  
새 기능은 **원본 레이아웃 위에만** 더한다 (Spotify · 서클 방문 스트립 · 뒤로가기 컨텍스트).

참고 스냅샷: `legacy-minihome-reference/` (`443d8b3^`, revert 금지)  
웹 기준: `src/pages/diary-home.tsx` + `src/index.css` (`.sk-outline` / `.cy-*`)  
모바일: `mobile/src/features/diary-home/` (`OutlineBox` ≈ sk-outline)

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

한 줄 연결:

```text
Try the demo
→ 우주 탄생 인트로 (MP4)
→ My Universe (구체 + 서클 행성)
→ 중앙 구체 탭 (또는 Diary 탭)
→ 파스텔 미니홈피 DiaryHompyHome (/diary/[userId])
```

- 웹 `/` = Your Diary (`DiaryHomePage`)
- 모바일: `mobile/src/features/diary-home/diary-hompy-home.tsx` (`OutlineBox` / `hompy-outline.tsx`)
- Diary 탭도 같은 `/diary/[userId]` 미니홈피로 진입
- 학교/Zalo HompyApp은 기본 마운트하지 않음
