// AI-assisted: see AI-ATTRIBUTION.md

import { FollowService } from "../service/FollowService";
import { countHandler } from "./followHandlers";

const followService = new FollowService();

export const handler = countHandler((token, user) =>
  followService.getFollowerCount(token, user),
);
