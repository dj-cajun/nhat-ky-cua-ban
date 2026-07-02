# Coding Conventions — 코딩 컨벤션

> **프로젝트**: Nhật ký của bạn

---

## 1. 일반 원칙

- **최소 범위**: 요청된 태스크만 수정. 무관한 리팩터링 금지.
- **기존 패턴 따르기**: 새 코드는 주변 코드 스타일과 일치.
- **자명한 코드**: 비즈니스 로직이 아닌 이상 주석 최소화.

---

## 2. TypeScript

```typescript
// ✅ 명시적 타입, interface for objects
interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  entryDate: string;
}

// ❌ any 사용 금지 (불가피한 경우 eslint-disable + 사유 주석)
```

- `strict: true` 유지
- API 응답은 `types/`에 정의
- enum 대신 `as const` 객체 + union type 선호

---

## 3. 네이밍

| 대상 | 규칙 | 예시 |
|------|------|------|
| 컴포넌트 | PascalCase | `DiaryCard.tsx` |
| 함수/변수 | camelCase | `fetchEntries` |
| 상수 | UPPER_SNAKE | `MAX_TITLE_LENGTH` |
| 파일 (컴포넌트) | PascalCase | `DiaryForm.tsx` |
| 파일 (유틸) | kebab-case | `format-date.ts` |
| DB 컬럼 | snake_case | `entry_date` |
| TS 필드 | camelCase | `entryDate` (매핑 시 변환) |

---

## 4. React / Next.js

- Server Components 기본, `'use client'`는 상호작용 필요 시만
- 데이터 fetching: Server Component 또는 Server Action
- 폼: React Hook Form + Zod validation
- 상태: 로컬은 `useState`, 서버 상태는 Server Component 재검증

```typescript
// ✅ Server Action 예시
'use server';

export async function createEntry(formData: FormData) {
  // validation → supabase insert → revalidatePath
}
```

---

## 5. 스타일링 (Tailwind)

- 유틸리티 클래스 우선
- 반복 패턴은 `@apply` 또는 컴포넌트로 추출 (3회 이상 반복 시)
- 다크 모드: `dark:` prefix

---

## 6. 에러 처리

```typescript
// ✅ 사용자 친화적 메시지 + 로깅
try {
  await saveEntry(data);
} catch (error) {
  console.error('[createEntry]', error);
  return { error: '일기를 저장하지 못했습니다. 다시 시도해 주세요.' };
}
```

- 민감 정보(스택, DB 에러)는 클라이언트에 노출하지 않음

---

## 7. Git / PR

- 브랜치: `feat/T-21-diary-create`, `fix/auth-redirect`
- 커밋: `feat: add diary create form` (Conventional Commits)
- PR 설명: 변경 요약 + 테스트 방법

---

## 8. 테스트

- 유틸/validation: Vitest 단위 테스트
- 핵심 플로우: Playwright E2E
- 테스트 파일: `*.test.ts`, `e2e/*.spec.ts`

---

## 9. 금지 사항

- `.env` / 시크릿 커밋
- `console.log` 프로덕션 코드 (디버그 후 제거)
- 하드코딩된 URL/키
- PRD/TRD와 충돌하는 임의 아키텍처 변경 (인간 승인 필요)
