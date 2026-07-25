export type CirclePostType = 'notice' | 'poll';
export type CirclePostStatus = 'active' | 'closed' | 'cancelled' | 'hidden';

export type CirclePost = {
  id: string;
  circleId: string;
  type: CirclePostType;
  title: string;
  body: string;
  status: CirclePostStatus;
  closesAt: string;
  createdBy: string;
  createdAt: string;
};

export type PollOption = {
  id: string;
  postId: string;
  label: string;
  sortOrder?: number;
};

export type CirclePostSummary = {
  postId: string;
  postType: CirclePostType;
  status?: string;
  isActive?: boolean;
  totalResponded: number | null;
  currentUserResponded: boolean;
  currentUserOptionId?: string | null;
  options: {
    id: string;
    label: string;
    count: number | null;
    sortOrder?: number;
  }[];
};

export type CreateCirclePostInput = {
  circleId: string;
  createdBy: string;
  type: CirclePostType;
  title: string;
  body?: string;
  closesAt: string;
  options?: string[];
};
