// AI-assisted: see AI-ATTRIBUTION.md

import { countHandler } from "./followHandlers";
import { followService } from "./ServiceProvider";

export const handler = countHandler((token, user) =>
  followService.getFolloweeCount(token, user),
);
