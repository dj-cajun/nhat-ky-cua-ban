# Nhật ký của bạn — 도화지 다꾸 리브랜딩 검수 체크리스트

마이그레이션 후 E2E 및 정적 진단으로 빠르게 점검하기 위한 기준입니다.

---

## 1. 정적 회귀 버그 검증

- [ ] **React 로직 컴파일**: `home.tsx`, `board.tsx`, `atoms.ts`의 `cy-*` 마크업 클래스를 수정하지 않았으므로 `npm run build` 및 `npm run typecheck`가 경고 없이 통과하는가?
- [ ] **E2E 회귀**: `e2e/app.spec.ts`의 `TODAY`, `Album ảnh mini`, Dotori 이동 셀렉터·레이아웃에 간섭이 없는가?

## 2. 모바일 가독성 및 폰트

- [ ] **베트남 성조**: `ă, â, đ, ê, ô, ơ, ư`가 Playpen Sans / Phudu로 깨지지 않고 렌더링되는가?
- [ ] **크레파스 섀도우**: 카드·쉘의 검정 `border`가 제거되고 파스텔 하드 섀도우로 경계가 구분되는가?

## 3. 도토리 테마

- [ ] **data-theme 스왑**: Dotori 상점에서 `default` / `retro-pink` / `neon` / `chalkboard` 전환 시 `src/index.css` 테마 오버라이드가 적용되는가?
