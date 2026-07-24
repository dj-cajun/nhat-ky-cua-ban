import { z } from 'zod';
import { MAX_TEN_CHAR } from '@/types/domain';

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Please enter a name.')
  .max(24, 'Name can be up to 24 characters.');

export const circleNameSchema = z
  .string()
  .trim()
  .min(1, 'Enter a circle name.')
  .max(40);

export const tenCharSchema = z
  .string()
  .trim()
  .max(MAX_TEN_CHAR, `Up to ${MAX_TEN_CHAR} characters.`);

export const shortTextSchema = z.string().trim().max(280);

export const guestbookSchema = z.string().trim().min(1).max(120);

export const noticeTitleSchema = z.string().trim().min(1).max(80);

export const signInSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
});

export const onboardingSchema = z.object({
  displayName: displayNameSchema,
  termsAccepted: z.literal(true, {
    error: 'Please agree to the terms to continue.',
  }),
});

export const proposeCircleSchema = z.object({
  proposedName: circleNameSchema,
  inviteeIds: z.tuple([z.string().uuid(), z.string().uuid()]),
});
