export type AnonymousPostItem = {
  id: string;
  aliasName: string;
  body: string;
  createdAt: string;
  isMine: boolean;
};

export type AnonymousPostsPage = {
  items: AnonymousPostItem[];
  nextCursor: { createdAt: string; id: string } | null;
};

export type CircleAlias = {
  aliasName: string;
  aliasId: string;
};
