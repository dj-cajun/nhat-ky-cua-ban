# B.1 Staging Access Request

> **Phase B.1: DEFERRED to Phase H** (베타 출시 게이트).  
> 지금 개발을 막지 않는다. 자격 증명·실측은 feature-complete 후 이 문서 + 런북으로 실행.

---

## 담당 확정

| 역할 | 이름 / 연락 | 비고 |
|------|-------------|------|
| Staging 권한 부여자 | | Supabase project owner/admin |
| 테스트 실행 담당자 | | 런북·sign-off 작성 |
| Sign-off 승인자 | | B.1 PASS 최종 확인 |

---

## 요청할 네 가지 (staging 담당자)

1. **Supabase staging project ref** (및 Dashboard URL)  
2. **`supabase db push` 가능한 인증** (CLI login / access token / linked project)  
3. **서버 전용 service-role key**  
4. **앱 테스트용 anon key**

### service-role 취급 (필수)

| 규칙 | |
|------|--|
| 저장 | 로컬 서버 env 또는 CI secret **만** |
| 앱 번들 | **절대 포함 금지** (`EXPO_PUBLIC_*` / `VITE_*` 금지) |
| 로그 | **출력 금지** (echo/print/secureLog 금지) |
| 용도 | 테스트 계정·`app_moderators` 시드 **만** |
| 회수 | 실측 종료 후 rotate 권장 |

anon key는 클라이언트 테스트용. service-role과 분리한다.

---

## 테스트 계정 이메일 규칙

실측 전용. 프로덕션 사용자와 섞지 않는다.

| Persona | 권장 패턴 | 역할 |
|---------|-----------|------|
| A | `b1+a.<yyymmdd>@staging.yourdiary.local` | 같은 학교 · 서클 멤버 |
| B | `b1+b.<yyymmdd>@staging.yourdiary.local` | 같은 학교 · 비서클 |
| C | `b1+c.<yyymmdd>@staging.yourdiary.local` | 다른 학교 verified |
| D | `b1+d.<yyymmdd>@staging.yourdiary.local` | pending_change |
| E | `b1+e.<yyymmdd>@staging.yourdiary.local` | suspended / expired |
| M | `b1+m.<yyymmdd>@staging.yourdiary.local` | ops only (`app_moderators`) |

- 비밀번호는 비밀번호 관리자에만 저장. 문서/PR에 평문 금지.  
- user id(UUID)만 sign-off §3에 기록 (email은 해시 또는 패턴만).  
- 실측 종료 후 계정 disable 또는 삭제.

---

## 증거 캡처 저장 위치

| 종류 | 위치 | 주의 |
|------|------|------|
| Sign-off 본문 | `docs/your-diary/21-phase-b1-staging-signoff.md` | PASS/FAIL + 표 |
| 동결 기록 | `docs/your-diary/b1-staging-run-freeze.md` | SHA·checksum |
| RPC 응답 / HTTP 코드 로그 | 팀 private store: `b1-staging/<date>/<sha>/` | JWT·service-role 마스킹 |
| RLS / Postgres 로그 발췌 | 동일 폴더 `logs/` | PII 최소화 |
| 스크린샷 (ops·deep link) | 동일 폴더 `shots/` | 개인 본문 비식별 |

PR에는 **마스킹된 요약 + sign-off 링크**만. raw JWT/service-role 첨부 금지.

---

## FAIL 시 재실행 기준

하나라도 FAIL이면 Phase H / 베타 출시 게이트 금지. 그다음:

1. 실패 경로만 수정 → **새 commit SHA**  
2. `019`/`020` checksum 재계산 → 동결 기록 **갱신** (이전 동결 폐기)  
3. clean `001→020` push (필요 시 DB reset 정책에 따름)  
4. A–E/M **전체 매트릭스 재실행** (부분 재실행으로 PASS 불가)  
5. `21` 새로 작성

테스트 **도중** 코드/migration 변경도 동일: 기존 동결 폐기 → 처음부터.

---

## Phase H 전에 하면 안 되는 것

- B.1 sign-off를 조건부 PASS로 바꾸기  
- 자격 증명 없이 empirical PASS 기입  
- (개발은 Phase C+ 계속 진행)  

---

## 재개 순서 (권한 수령 후)

```text
동결 SHA checkout
→ checksum 재확인
→ 001~020 clean push
→ A–E/M 실제 Auth 계정 생성
→ JWT 경로 매트릭스 전수
→ 로그·응답·audit 증거 수집
→ 21 문서 작성
→ 승인
```
