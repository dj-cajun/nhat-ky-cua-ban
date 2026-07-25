export type CircleResponseVerifiedEvent = {
  type: 'circle_response_verified';
  circleId: string;
  postId: string;
  userId: string;
  responded: true;
};

export type CirclePostClosedEvent = {
  type: 'circle_post_closed';
  circleId: string;
  postId: string;
};

/** userId → verified response for a post (no option / no timestamp) */
export type VerifiedResponseMap = Record<
  string,
  {
    postId: string;
    responded: true;
  }
>;

export type ActivePostBadgeStates = {
  postId: string | null;
  respondedUserIds: string[];
};
