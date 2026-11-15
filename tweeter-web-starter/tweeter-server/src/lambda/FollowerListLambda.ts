// AI-assisted: see AI-ATTRIBUTION.md

import { FollowService } from "../service/FollowService";
import { userPageHandler } from "./followHandlers";

const followService = new FollowService();

export const handler = userPageHandler((token, userAlias, pageSize, lastItem) =>
  followService.loadMoreFollowers(token, userAlias, pageSize, lastItem),
);
