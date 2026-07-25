import {
  blockPrivateMessageSender as localBlock,
  getMyMessagePreferences as localGetPrefs,
  getReceivedMessages as localReceived,
  getSentMessages as localSent,
  hidePrivateMessage as localHide,
  listSharedCirclesWith as localShared,
  openPrivateMessage as localOpen,
  replyToPrivateMessage as localReply,
  sendAliasMessage as localAlias,
  sendNamedMessage as localNamed,
  updateMyMessagePreferences as localUpdatePrefs,
} from '@/features/local/repository';
import { validatePrivateMessageBody } from './private-message.validation';
import type {
  MessagePrefs,
  MessagesPage,
  ReceivedMessageItem,
  SenderMode,
  SentMessageItem,
} from './private-message.types';

export async function listSharedCirclesWith(viewerId: string, otherUserId: string) {
  return localShared(viewerId, otherUserId);
}

export async function getMyMessagePreferences(userId: string): Promise<MessagePrefs> {
  return localGetPrefs(userId);
}

export async function updateMyMessagePreferences(
  userId: string,
  namedEnabled: boolean,
  aliasEnabled: boolean,
): Promise<MessagePrefs> {
  return localUpdatePrefs(userId, namedEnabled, aliasEnabled);
}

export async function sendNamedMessage(input: {
  circleId: string;
  senderId: string;
  recipientId: string;
  body: string;
  replyToMessageId?: string | null;
  clientRequestId: string;
}) {
  validatePrivateMessageBody(input.body);
  return localNamed(input);
}

export async function sendAliasMessage(input: {
  circleId: string;
  senderId: string;
  recipientId: string;
  body: string;
  replyToMessageId?: string | null;
  clientRequestId: string;
}) {
  validatePrivateMessageBody(input.body);
  return localAlias(input);
}

export async function replyToPrivateMessage(input: {
  sourceMessageId: string;
  actorId: string;
  senderMode: SenderMode;
  body: string;
  clientRequestId: string;
}) {
  validatePrivateMessageBody(input.body);
  return localReply(input);
}

export async function getReceivedMessages(input: {
  viewerId: string;
  cursorCreatedAt?: string | null;
  cursorId?: string | null;
  limit?: number;
}): Promise<MessagesPage<ReceivedMessageItem>> {
  return localReceived(input);
}

export async function getSentMessages(input: {
  viewerId: string;
  cursorCreatedAt?: string | null;
  cursorId?: string | null;
  limit?: number;
}): Promise<MessagesPage<SentMessageItem>> {
  return localSent(input);
}

export async function openPrivateMessage(messageId: string, viewerId: string) {
  return localOpen(messageId, viewerId);
}

export async function hidePrivateMessage(messageId: string, userId: string) {
  return localHide(messageId, userId);
}

export async function blockPrivateMessageSender(messageId: string, actorId: string) {
  return localBlock(messageId, actorId);
}
