import { z } from 'zod';
import { MAX_TEN_CHAR } from '@/types/domain';

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, '이름을 입력해 주세요.')
  .max(24, '이름은 24자까지입니다.');

export const circleNameSchema = z
  .string()
  .trim()
  .min(1, '서클 이름을 입력해 주세요.')
  .max(40);

export const tenCharSchema = z
  .string()
  .trim()
  .max(MAX_TEN_CHAR, `${MAX_TEN_CHAR}자까지 작성할 수 있어요.`);

export const shortTextSchema = z.string().trim().max(280);

export const guestbookSchema = z.string().trim().min(1).max(120);

export const noticeTitleSchema = z.string().trim().min(1).max(80);

export const signInSchema = z.object({
  email: z.string().email('올바른 이메일을 입력해 주세요.'),
});

export const onboardingSchema = z.object({
  displayName: displayNameSchema,
  termsAccepted: z.literal(true, {
    error: '약관에 동의해 주세요.',
  }),
});

export const proposeCircleSchema = z.object({
  proposedName: circleNameSchema,
  inviteeIds: z.tuple([z.string().uuid(), z.string().uuid()]),
});
