# 18 — 미니홈피 UI → Your Diary 매핑

> **상태**: 현행  
> **최종 갱신**: 2026-07-25

---

## 원칙

옛 제품 **기능**(학교·Zalo·도토리·TODAY/TOTAL·수사)은 버린다.  
옛 미니홈피 **인터페이스**(파스텔·`sk-outline` 색연필 테두리·프로필·캘린더·앨범·방명록 분위기)는 디자인 원본으로 살린다.  
새 기능은 **원본 레이아웃 위에만** 더한다 (Spotify · 뒤로가기 컨텍스트).  
브랜드 줄(「너의 다이어리」)·내홈/친구홈 방문 스트립은 **제거**.

참고 스냅샷: `legacy-minihome-reference/` (`443d8b3^`, revert 금지)  
웹 기준: `src/pages/diary-home.tsx` + `src/index.css` (`.sk-outline` / `.cy-*`)  
모바일: `mobile/src/features/diary-home/` (`OutlineBox` ≈ sk-outline)

---

## 매핑

| 옛 미니홈피 | 현재 Your Diary |
|-------------|-----------------|
| 홈 레이아웃 (`cy-shell` / `cy-canvas`) | `DiaryHomePage` / `DiaryHompyHome` |
| 프로필 카드 | 기분 · 10자/상태 · 서클 뱃지 |
| 사진첩 | 미니 앨범 패널 (날짜별 사진 자리) |
| 캘린더 | 주간 다이어리 10자 |
| 써클게시판 (학교 스타일) | **같은 서클이면** 홈피 미리보기 · 가명(별명) 게시판으로 진입 |
| 방명록 | **해당 홈피에서만** · 손님이 작성 · `/diary/[userId]/guestbook` |
| 자유게시판 | **해당 홈피에서만** · **홈피 주인도 작성** · `/diary/[userId]/free-board` |
| 음악 영역 | Spotify 오늘의 음악 카드 자리 |
| 친구 워프 | **제거** (내홈/친구홈 스트립 없음) |
| StatusBar TODAY/TOTAL · Dotori | **제거** |
| Investigation · Gift · VoteLock | **제거** |

### 게시판 규칙

1. **써클게시판** — 나와 홈피 주인이 **같은 서클**일 때만 섹션 표시. 데이터는 서클 가명 게시판(`anonymous-board`).
2. **방명록** — 개인 홈피 스코프. 손님 작성, 주인 열람.
3. **자유게시판** — 개인 홈피 스코프. 주인·방문객 모두 작성 가능 (주인도 쓸 수 있음이 방명록과의 차이).

홈 미리보기는 예전 학교 스타일 스택: 제목 줄 + 글 3줄 (`HompyBoardStack` ≈ `SwipeCardStack`).

---

## 런타임

한 줄 연결:

```text
Try the demo
→ 우주 탄생 인트로 (MP4)
→ My Universe (구체 + 서클 행성)
→ 중앙 구체 탭 (또는 Diary 탭)
→ 파스텔 미니홈피 DiaryHompyHome (/diary/[userId])
→ 써클 / 방명록 / 자유게시판
```

- 웹 `/` = Your Diary (`DiaryHomePage`)
- 모바일: `mobile/src/features/diary-home/diary-hompy-home.tsx` (`OutlineBox` / `hompy-outline.tsx`)
- Diary 탭도 같은 `/diary/[userId]` 미니홈피로 진입
- 학교/Zalo HompyApp은 기본 마운트하지 않음
