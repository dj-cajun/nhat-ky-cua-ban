# 17 — i18n 1차 (English · 한국어)

> **상태**: 현행  
> **최종 갱신**: 2026-07-24

---

## 범위 (1차)

| 표면 | 기본 | 전환 |
|------|------|------|
| Vite 5층 홈피 (`/`) | `en` (브라우저 `ko*`면 `ko`) | StatusBar · Intro · Login 토글 |
| Expo mobile | `en` | 설정 화면 토글 |
| 서클 v1 (`/?v1=1`) | 한글 하드코딩 (후속 통합) | — |

베트남어(`vi.ts`)는 보관만. **1차 출시 로케일은 `en` · `ko`.**

---

## 웹

- 카탈로그: `src/i18n/en.ts`, `src/i18n/ko.ts`
- API: `useMessages()` · `getMessages()` · `setLocale()` · `LanguageSwitcher`
- 저장: `localStorage['your-diary-locale']`

## 모바일

- 카탈로그: `mobile/src/i18n/en.ts`, `mobile/src/i18n/ko.ts`
- API: `mobile/src/i18n/index.ts` (동일 패턴)
- 저장: `localStorage['your-diary-mobile-locale']` (네이티브는 AsyncStorage 후속)

---

## 브랜드

| 로케일 | 표기 |
|--------|------|
| en | Your Diary |
| ko | 너의 다이어리 |
