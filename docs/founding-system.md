# 3인 최초 개척단 시스템 (Class Founding)

> **메인 플로우에 통합됨** — 별도 데모 URL 없이 온보딩 직후 자동 진입  
> **초기화 테스트**: `/?reset=1`  
> **Zalo 초대 링크**: `/?founding=join&token=fc_...`

## 통합 플로우

```
로그인 → 온보딩(학교·학급·힌트) → 개척단 관문 → 홈
                                      ↑
                         학급이 아직 active가 아니면 필수
```

### 단계별 동작

| 상황 | 화면 |
|------|------|
| 온보딩 직후, 해당 학급 최초 | 자동 선점 → Zalo 링크 공유 (pending) |
| 개척단 멤버, 3명 미만 | pending (진행률 표시) |
| 개척단 멤버, 3명 충족 | 퀴즈 3개 입력 (forming) |
| 퀴즈 등록 완료 | 홈 진입 (active) |
| 비멤버, 개척 중 | waiting (단톡 링크 요청) |
| 4번째 이후 유저 | 퀴즈 게이트 (gate) |
| 게이트 통과 | 홈 진입 |

### Zalo 초대 링크

1. 링크 클릭 → 토큰 sessionStorage 저장
2. 미로그인 → 로그인 → 온보딩 (학교·학급 자동 prefill)
3. 온보딩 완료 → 자동 join → 개척단 화면

## 파일 구조

| 파일 | 역할 |
|------|------|
| `src/lib/founding-router.ts` | `resolveFoundingRoute`, `bootstrapFounding` |
| `src/lib/class-founding.ts` | 저장소·claim/join/quiz/gate |
| `src/lib/founding-params.ts` | 초대 URL 파싱·토큰 stash |
| `src/pages/founding.tsx` | 개척단 UI (온보딩 다음 단계) |
| `src/app.tsx` | `AppStage: founding` 관문 |

## localStorage 키

- `diary_class_foundings` — 학급 개척 상태
- `diary_founding_gates` — 4번째+ 유저 게이트 통과 기록

## API (프로덕션 연동 시)

```ts
canEnterClassHome(school, class, userId)
resolveFoundingRoute(school, class, userId)
bootstrapFounding(school, class, userId, userName)
claimFounding / joinFoundingByToken / submitFoundingQuizzes / verifyFoundingGate
```

## 데모 팁

- `/?reset=1` — 전체 초기화 후 처음부터 (온보딩 → 개척단)
- 페이지 하단 **Reset demo lớp này** — 해당 학급만 재시연
- **🧪 mô phỏng bạn cùng lớp vào** — Zalo 없이 2·3번째 유저 시뮬레이션

## 테스트

```bash
npm test -- tests/class-founding.test.ts
```
