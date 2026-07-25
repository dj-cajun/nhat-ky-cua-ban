export type SenderMode = 'named' | 'alias';

export type MessagePrefs = {
  namedEnabled: boolean;
  aliasEnabled: boolean;
};

export type MessageCircleRef = {
  id: string;
  name: string;
};

export type ReceivedMessageItem = {
  id: string;
  senderMode: SenderMode;
  senderDisplay: string;
  body: string;
  circle: MessageCircleRef;
  isOpened: boolean;
  createdAt: string;
  replyToMessageId: string | null;
};

export type SentMessageItem = {
  id: string;
  senderMode: SenderMode;
  recipientDisplay: string;
  body: string;
  circle: MessageCircleRef;
  createdAt: string;
  replyToMessageId: string | null;
};

export type MessagesPage<T> = {
  items: T[];
  nextCursor: { createdAt: string; id: string } | null;
};
