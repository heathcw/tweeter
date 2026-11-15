// AI-assisted: see AI-ATTRIBUTION.md

import { FollowService } from "../service/FollowService";
import { followActionHandler } from "./followHandlers";

const followService = new FollowService();

export const handler = followActionHandler((token, user) =>
  followService.follow(token, user),
);
