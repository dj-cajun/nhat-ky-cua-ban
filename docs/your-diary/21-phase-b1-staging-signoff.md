# 21 — Phase B.1 Staging Sign-off

> **상태**: 실측 대기 (기획 논의 종료 · staging 결과만으로 닫음)  
> **선행**: `019_school_trust_boundary.sql` + `020_school_boundary_hardening.sql` staging 적용  
> **체크리스트**: [`supabase/tests/020_staging_jwt_penetration_checklist.sql`](../../supabase/tests/020_staging_jwt_penetration_checklist.sql)

---

## 완료 정의 (고정)

| Phase | 의미 |
|-------|------|
| **B 완료** | 학교 경계가 기존 권한 경로에 **적용된** 상태 (코드·마이그레이션) |
| **B.1 완료** | 실제 staging JWT로 그 경계가 **우회되지 않음을 증명한** 상태 |

```text
019 + 020 staging 적용
→ A–E / M 페르소나 JWT 전수 테스트
→ 경로 매트릭스 전수 PASS
→ 로그 검토
→ 혼재 서클 resolve 실제 검증
→ B.1 승인
→ Phase C 상태 화면
```

규칙: **shared predicate를 거치지 않는 경로 하나라도 있으면 B.1 미완료.**

---

## 결과 문서에 남길 항목 (이것만)

아래를 채운 뒤 B.1을 승인한다. 장황한 기획 서술은 넣지 않는다.

| # | 항목 | 기록 |
|---|------|------|
| 1 | staging 프로젝트 URL / ref | |
| 2 | 적용 migration 버전 | `019`, `020` (및 DB revision) |
| 3 | 테스트한 실제 계정 / 페르소나 | A–E, M (user id 또는 email 해시) |
| 4 | 경로별 예상 결과 vs 실제 결과 | 매트릭스 표 또는 체크리스트 사본 |
| 5 | 거부 시 반환 코드 | `FORBIDDEN` / `NOT_FOUND` / false 등 |
| 6 | 관련 서버·RLS 로그 | 링크 또는 첨부 경로 |
| 7 | 발견된 우회와 수정 커밋 | 없으면 `none` |
| 8 | 혼재 서클 freeze / resolve 사례 | incident id · note · audit event |
| 9 | 최종 실행자 · 승인 시각 | |

---

## 페르소나 (고정)

| ID | 상태 | 기대 |
|----|------|------|
| A | 같은 학교 · 정상 서클 멤버 | 허용 |
| B | 같은 학교 · 비서클 | 거절 |
| C | 다른 학교 (+ known id / invite) | 존재 숨김 (`NOT_FOUND`) |
| D | `pending_change` | 읽기만 · 쓰기 거절 |
| E | 정지·만료 (+ known id) | 접근 불가 |
| M | `app_moderators` | **명시된 ops만** |

### M 추가 게이트 (필수)

운영 권한이 **일반 데이터 열람권으로 번지지 않을 것.**

- 허용: 학교 인증·변경 검토, 혼재 스캔/resolve, 신고 스냅샷 기반 검토, 계정 제한 등 **명시된 ops RPC**
- 금지: 이유 없는 개인 다이어리·쪽지·방명록·가명글 전체 조회 (신고/케이스 컨텍스트 없는 SELECT/RPC)

검증 예:

```text
M JWT로 can_view_diary_entry(타인 공유 글) — 비서클이면 false (학교 ops ≠ 멤버십)
M JWT로 get_received_messages / get_anonymous_circle_posts(비서클) — FORBIDDEN
M JWT로 ops_list_school_verification_requests — ok
A JWT로 ops_* — FORBIDDEN
```

---

## 경로 매트릭스 (전수)

```text
circle read/write
diary read/write
notice/poll
pseudonymous board
private notes
guestbook
invite preview
presence publish
deep link
cached screen refresh
account switch
```

상세 셀: `020_staging_jwt_penetration_checklist.sql`

---

## Phase C (B.1 승인 후에만 · 작게)

```text
코드 입력
검토 중
추가 확인 필요
승인
거절
학교 변경 검토 중
```

학교 홈 · 학생 목록 · 탐색 **금지**.

---

## Sign-off

| | |
|--|--|
| Result | ☐ PASS · ☐ FAIL |
| Executor | |
| Approver | |
| Approved at (UTC) | |
| Notes | |
