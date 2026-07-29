# 05 — 4.5단계: RLS 침투 테스트

> **상태**: ✅ CI/미러 완료 (2026-07-24) — live Supabase SQL fixture는 프로젝트 연결 시 `supabase/tests/*.sql`로 재실행  
> **출처**: 사용자 제공 4.5단계 지시서  
> **원칙**: 정상 UI보다 **변조 클라이언트의 직접 API 호출**이 폐쇄 규칙을 우회하는지 검증

---

## 목표

승인 전 비멤버·외부인이 Supabase를 직접 쳐도 서클 내부 데이터·멤버십·추천 결정을 조작/열람할 수 없다.

### 테스트 계정

```text
A, B, C: 기존 서클 멤버
D: 가입 신청자
E: 아무 관계 없는 외부인
F: 다른 서클 멤버
G: 정지 또는 차단 상태 사용자
```

---

## 공격 시나리오 (요약)

1. 승인 전 서클 접근 (`circle_members`, 공지/투표, 다이어리, Storage, 가명, 메시지, Presence)
2. 추천 신청 위조 (2/4명, 중복, 본인, 외부인, 타서클, pending 중복, 닫힌 서클…) — 실패 후 부분 행 0건
3. 추천 응답 위조 (자기 승인, 타인 배정 응답, 이중 승인, 불법 decision, 만료/취소 후…)
4. 직접 테이블 조작 (members / recommendations / requests INSERT·UPDATE·DELETE)
5. 정보 유출 (추천자 ID·이름·decision·시각 — progress RPC·조인·View 포함)
6. 동시성 (세 번째 추천 동시 → membership 1행, 알림 ≤1)
7. 만료·취소
8. 차단 관계 (생성·응답·승인 시점 재검사) — 미구현이면 pending 표기
9. Storage 경로 추측·signed URL
10. JWT·세션 (`auth.uid()`만 신뢰)
11. `SECURITY DEFINER` + `search_path=''` + EXECUTE 권한

---

## 구현 산출물

| 경로 | 역할 |
|------|------|
| `supabase/migrations/011_rls_penetration_hardening.sql` | 동시성·차단 재검사·테이블 DML revoke·Storage |
| `supabase/tests/join-*.sql` 등 | DB 직접 침투 스크립트 (live Supabase) |
| `tests/security/*.spec.ts` | CI용 로컬 미러 공격 시나리오 |
| `npm run test:security` | CI 연결 |

---

## 완료 기준

지시서 §13 체크리스트 — `roadmap.md`에서 갱신.

## 5단계 선행 원칙

> DB에 장기 온라인 기록을 남기지 않고, 연 서클 채널에서만 초록 표시.  
> Presence 전에 **`circle:{id}` 비멤버 구독 차단**이 먼저.
