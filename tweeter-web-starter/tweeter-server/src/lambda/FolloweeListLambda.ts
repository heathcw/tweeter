// AI-assisted: see AI-ATTRIBUTION.md

import { userPageHandler } from "./followHandlers";
import { followService } from "./ServiceProvider";

export const handler = userPageHandler((token, userAlias, pageSize, lastItem) =>
  followService.loadMoreFollowees(token, userAlias, pageSize, lastItem),
);
