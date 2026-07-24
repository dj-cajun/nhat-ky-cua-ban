import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: async (k: string) => {
      store.delete(k);
    },
  },
}));

import {
  blockPrivateMessageSender,
  clearLocalDb,
  demoAcceptAll,
  getReceivedMessages,
  getSentMessages,
  openPrivateMessage,
  proposeCircleDraft,
  resolvePrivateMessageSender,
  sendAliasMessage,
  sendNamedMessage,
  signUpLocal,
  submitReportServerSnapshot,
  updateMyMessagePreferences,
} from '@/features/local/repository';

async function openCircleWithThree() {
  const a = await signUpLocal('Alex');
  const b = await signUpLocal('Blake');
  const c = await signUpLocal('Casey');
  const { draftId } = await proposeCircleDraft(a.id, 'Notes Circle', [b.id, c.id]);
  const circle = await demoAcceptAll(draftId);
  return { a, b, c, circle };
}

describe('private notes security mirror', () => {
  beforeEach(async () => {
    store.clear();
    await clearLocalDb();
  });

  it('delivers named notes without read receipts on sent list', async () => {
    const { a, b, circle } = await openCircleWithThree();
    const sent = await sendNamedMessage({
      circleId: circle.id,
      senderId: a.id,
      recipientId: b.id,
      body: 'Glad you’re here',
      clientRequestId: 'n1',
    });
    const inbox = await getReceivedMessages({ viewerId: b.id });
    expect(inbox.items[0].senderDisplay).toBe('Alex');
    expect(inbox.items[0].isOpened).toBe(false);
    await openPrivateMessage(sent.id, b.id);
    const sentList = await getSentMessages({ viewerId: a.id });
    expect(JSON.stringify(sentList.items[0])).not.toMatch(/isOpened|openedAt|read/);
  });

  it('shows alias display without sender id on received payload', async () => {
    const { a, b, circle } = await openCircleWithThree();
    await sendAliasMessage({
      circleId: circle.id,
      senderId: a.id,
      recipientId: b.id,
      body: 'Your entry was kind',
      clientRequestId: 'a1',
    });
    const inbox = await getReceivedMessages({ viewerId: b.id });
    expect(inbox.items[0].senderMode).toBe('alias');
    expect(inbox.items[0].senderDisplay).not.toBe('Alex');
    expect(JSON.stringify(inbox.items[0])).not.toMatch(/senderId|authorUserId/);
  });

  it('blocks cross-circle sends', async () => {
    const { a, circle } = await openCircleWithThree();
    const outsider = await signUpLocal('Out');
    await expect(
      sendNamedMessage({
        circleId: circle.id,
        senderId: a.id,
        recipientId: outsider.id,
        body: 'hi',
        clientRequestId: 'x1',
      }),
    ).rejects.toThrow(/members/i);
  });

  it('rejects alias notes when recipient disabled alias', async () => {
    const { a, b, circle } = await openCircleWithThree();
    await updateMyMessagePreferences(b.id, true, false);
    await expect(
      sendAliasMessage({
        circleId: circle.id,
        senderId: a.id,
        recipientId: b.id,
        body: 'secret hello',
        clientRequestId: 'off1',
      }),
    ).rejects.toThrow(/alias note/i);
    await sendNamedMessage({
      circleId: circle.id,
      senderId: a.id,
      recipientId: b.id,
      body: 'named still ok',
      clientRequestId: 'named-ok',
    });
  });

  it('enforces alias rate limit of 1 per recipient per day', async () => {
    const { a, b, circle } = await openCircleWithThree();
    await sendAliasMessage({
      circleId: circle.id,
      senderId: a.id,
      recipientId: b.id,
      body: 'one',
      clientRequestId: 'r1',
    });
    await expect(
      sendAliasMessage({
        circleId: circle.id,
        senderId: a.id,
        recipientId: b.id,
        body: 'two',
        clientRequestId: 'r2',
      }),
    ).rejects.toThrow(/wait|limit/i);
  });

  it('blocks sender without revealing identity; resolve needs moderator case', async () => {
    const { a, b, circle } = await openCircleWithThree();
    const msg = await sendAliasMessage({
      circleId: circle.id,
      senderId: a.id,
      recipientId: b.id,
      body: 'report path',
      clientRequestId: 'rp1',
    });
    const reportId = await submitReportServerSnapshot({
      reporterId: b.id,
      targetType: 'message',
      targetId: msg.id,
      reason: 'harassment',
      hideForMe: true,
    });
    await blockPrivateMessageSender(msg.id, b.id);
    const inbox = await getReceivedMessages({ viewerId: b.id });
    expect(inbox.items.find((m) => m.id === msg.id)).toBeUndefined();

    await expect(
      resolvePrivateMessageSender({
        messageId: msg.id,
        moderationCaseId: reportId,
        reason: 'review',
        adminId: b.id,
        isModerator: false,
      }),
    ).rejects.toThrow(/Moderator/i);

    const resolved = await resolvePrivateMessageSender({
      messageId: msg.id,
      moderationCaseId: reportId,
      reason: 'safety review',
      adminId: 'mod-1',
      isModerator: true,
    });
    expect(resolved.senderId).toBe(a.id);
  });
});
