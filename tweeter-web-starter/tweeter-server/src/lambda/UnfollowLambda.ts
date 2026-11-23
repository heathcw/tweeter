// AI-assisted: see AI-ATTRIBUTION.md

import { followActionHandler } from "./followHandlers";
import { followService } from "./ServiceProvider";

export const handler = followActionHandler((token, user) =>
  followService.unfollow(token, user),
);
