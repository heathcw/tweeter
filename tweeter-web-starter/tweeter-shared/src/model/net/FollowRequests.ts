// AI-assisted: see AI-ATTRIBUTION.md

import { UserDto } from "../domain/User";
import { TweeterRequest } from "./TweeterRequest";
import { TweeterResponse } from "./TweeterResponse";

// Follow, unfollow, and both count routes send the same body.
export interface TargetUserRequest extends TweeterRequest {
  token: string;
  user: UserDto;
}

export interface IsFollowerRequest extends TweeterRequest {
  token: string;
  user: UserDto;
  selectedUser: UserDto;
}

export interface CountResponse extends TweeterResponse {
  count: number;
}

export interface FollowActionResponse extends TweeterResponse {
  followerCount: number;
  followeeCount: number;
}

export interface IsFollowerResponse extends TweeterResponse {
  isFollower: boolean;
}
