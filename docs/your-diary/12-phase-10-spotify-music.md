# 12 — 10단계: Spotify 오늘의 음악 카드

> **상태**: ✅ 완료 (2026-07-24)  
> **핵심**: 하루 다이어리에 **노래 한 곡**을 놓고, 방문자가 Spotify에서 듣게 한다. 앱 내 재생·자동재생 없음.

---

## 원칙

- 날짜별 최대 1곡 · 없어도 기록 가능
- 자동재생 금지 · 사용자가 누를 때만 Spotify로 이동
- Spotify 계정 연결 강제 없음 (서버 카탈로그 검색 중계)
- client secret / access token은 Edge Function만
- 부모 다이어리 공개 범위·차단 상속
- 검색어·곡 ID·취향을 분석 이벤트로 보내지 않음

---

## 서버 (`018_diary_spotify_music.sql`)

| 항목 | 역할 |
|------|------|
| `diary_music_modules` | 엔트리당 1곡 · 정규화 메타데이터 |
| `apply_diary_spotify_track` | Edge가 검증한 메타만 저장 |
| `get_diary_music` / `remove_diary_music` | 조회·제거 |
| `can_view_diary_entry` | 공개 범위 + 차단 |

Edge Functions:

- `search-spotify-tracks`
- `resolve-spotify-track`
- `set-diary-spotify-track` (Spotify 재조회 후 RPC)

시크릿 미설정 시 데모 카탈로그로 로컬/베타 가능.

`017` 이하 무수정.

---

## 클라이언트

- `features/diary-music/` — 파서 · 카드 · 피커 · service
- 다이어리 편집: 검색 / 링크 붙여넣기 → 확인 후 저장
- 카드: 정사각 커버 · Spotify 표시 · Listen on Spotify (오버레이 아이콘 없음)

---

## 다음

**10.5 레거시 정리** — 완료 → [13-phase-10.5-legacy-cleanup.md](./13-phase-10.5-legacy-cleanup.md)  
다음은 **11단계 통합 안정화·베타 준비**.
