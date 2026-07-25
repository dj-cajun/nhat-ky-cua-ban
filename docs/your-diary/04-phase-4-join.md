# 04 — 4단계: 3인 추천 가입

> **상태**: ✅ 완료 (2026-07-24)  
> **코드**: `supabase/migrations/010_circle_join_three_recommendations.sql`  
> **미러**: `mobile/src/features/local/repository.ts`, `src/lib/v1-store.ts`  
> **출처**: 사용자 제공 4단계 개발 지시서 (원문 반영)

---

## 목표

기존 서클 멤버가 아닌 사용자는 **초대 링크만으로 가입할 수 없다.**

> 가입 신청자가 자신을 아는 기존 멤버 3명을 선택하고, 서로 다른 3명이 추천해야만 서클 멤버가 된다.

추천 3명 미만인 상태에서는 서클 내부 데이터에 접근할 수 없어야 한다.

---

## 1. 사용자 플로우

```text
서클 초대 링크 진입
→ 서클의 최소 정보 확인
→ 가입 신청
→ 나를 아는 멤버 3명 선택
→ 추천 요청 발송
→ 추천 진행 상태 확인
→ 3명 모두 추천
→ 자동 가입
→ 서클 진입
```

가입 신청자에게 보이는 상태:

```text
추천 요청 중 · 1/3
추천 요청 중 · 2/3
가입 완료
요청 종료
```

표시하지 않는 정보:

- 누가 추천했는지
- 누가 추천하지 않았는지
- 누가 `잘 모르겠어요` / Not sure 를 선택했는지
- 각 추천자의 응답 시각

---

## 2. 추천자 화면

> 이 사람을 실제로 알고 있으며, 이 서클에 함께 있어도 괜찮나요?

버튼:

- `추천하기` / Recommend → `recommended`
- `잘 모르겠어요` / Not sure → `unknown`
- `나중에` / Later → **DB 미변경** (pending 유지, UI만 닫기)

`거절`이라는 공격적 표현은 사용하지 않는다.  
`unknown`이어도 신청자에게 거절 사실·추천자 이름을 공개하지 않는다.

---

## 3. 데이터베이스

### `circle_join_requests` (007 생성 → 010에서 필드·제약 정렬)

- `status`: pending | approved | expired | cancelled (+ legacy rejected)
- `expires_at` 기본 7일
- `approved_at`, `updated_at`
- unique partial index: `one_pending_join_request_per_user` (circle_id, applicant_id) WHERE pending

### `circle_recommendations` (물리 테이블명 유지)

- guide의 `circle_join_recommendations`는 **뷰**로 노출
- `decision`: pending | recommended | unknown
- `responded_at`
- `unique(request_id/join_request_id, recommender_id)`

멤버십: `circle_members` PK `(circle_id, user_id)` — 동시 승인 시 중복 행 방지

---

## 4. RPC: `create_circle_join_request(target_circle_id, recommender_ids[])`

클라이언트에서 여러 테이블을 직접 insert하지 않는다.

서버 검증:

1. 로그인 사용자
2. 신청자가 기존 멤버가 아님
3. 서클이 open
4. 추천자 정확히 3명
5. 중복 없음
6. 전원 활성 멤버
7. 본인 제외
8. 기존 pending 신청 없음
9. 차단 관계 제외
10. 신청 + 추천 3건 **한 트랜잭션** — 실패 시 전체 롤백

---

## 5. RPC: `respond_circle_recommendation(recommendation_id, decision)`

서버 검증:

- 로그인 사용자가 해당 추천의 추천자인가
- 신청이 pending인가 / 미만료인가
- 추천자가 여전히 활성 멤버인가
- 이미 응답하지 않았는가
- decision ∈ {recommended, unknown}

집계:

```sql
count(distinct recommender_id) where decision = 'recommended'
```

3명이 되면 같은 트랜잭션에서:

1. `circle_members`에 신청자 추가 (`ON CONFLICT DO NOTHING`)
2. request → `approved`, `approved_at = now()`
3. 남은 pending 추천 종료
4. 가입 완료 알림 이벤트

---

## 6. RLS

| 주체 | 가능 | 불가 |
|------|------|------|
| 신청자 | 본인 신청 상태, **추천 완료 숫자**(RPC) | 추천자 명단, 개별 결정, 응답 시각 |
| 추천자 | 본인에게 온 요청, 신청자 표시명·아바타, 서클명, 신청 시각 | 신청자 다이어리·서클 외부 개인정보 |
| 비멤버 | invite preview만 | 멤버 목록, 공지, 투표, 다이어리 공유, 가명, Presence |

---

## 7. UI 라우트

```text
/circles/:circleId/join
/join-requests/:requestId
/recommendations
/recommendations/:recommendationId
```

- 가입: 정확히 3명 선택 시 버튼 활성  
- 상태: n/3만, 추천자 변경은 1.0 제외(취소 후 재신청)  

---

## 8. 데모

```text
신청자: 유진 / Yujin
추천자: 민서·준호·서연 / Minseo·Junho·Seoyeon
```

1. 유진이 세 명 선택  
2. 민서 추천 → 1/3  
3. 준호 추천 → 2/3  
4. 서연 추천 → 자동 가입  
5. 유진 서클 접근 가능  

반대: 서연 `unknown` → 2/3 유지, 미가입, 선택 비공개

---

## 9. 완료 조건 체크

| 조건 | 결과 |
|------|------|
| 가입·추천 UI | ✅ |
| 정확히 3명 | ✅ |
| 서버 집계·자동 가입 | ✅ (010 + local mirror) |
| RLS 승인 전 차단 | ✅ 정책 + checklist |
| 추천 신원 비공개 | ✅ progress RPC |
| 중복·동시성 | ✅ unique + ON CONFLICT |
| typecheck/build/unit/E2E | ✅ |
| migration `010`, 007·008 미수정 | ✅ |

---

## 구현 메모

- Edge `approve-circle-member`: `recommendationId` 우선, 구 `requestId` 래퍼 유지  
- 4.5: `supabase/tests/010_join_rls_checklist.sql`를 실제 DB에서 실행
