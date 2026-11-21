// AI-assisted: see AI-ATTRIBUTION.md

import { StatusDto } from "tweeter-shared";
import { AuthTokenRecord, UserRecord } from "../PersistenceTypes";

export interface UserItem {
  alias: string;
  firstName: string;
  lastName: string;
  imageUrl: string;
  passwordHash: string;
  followerCount: number;
  followeeCount: number;
}

export interface AuthTokenItem {
  token: string;
  userAlias: string;
  createdAt: number;
  lastUsedAt: number;
  expiresAt: number;
  /** DynamoDB TTL expects epoch seconds and removes expired items eventually. */
  cleanupAt: number;
}

export interface FollowItem {
  followerAlias: string;
  followeeAlias: string;
}

export interface StoryItem {
  authorAlias: string;
  timestamp: number;
  status: StatusDto;
}

export interface FeedItem {
  ownerAlias: string;
  feedSortKey: string;
  status: StatusDto;
}

export function toUserItem(record: UserRecord): UserItem {
  return {
    alias: record.alias,
    firstName: record.firstName,
    lastName: record.lastName,
    imageUrl: record.imageUrl,
    passwordHash: record.passwordHash,
    followerCount: record.followerCount,
    followeeCount: record.followeeCount,
  };
}

export function fromUserItem(item: UserItem): UserRecord {
  return {
    alias: item.alias,
    firstName: item.firstName,
    lastName: item.lastName,
    imageUrl: item.imageUrl,
    passwordHash: item.passwordHash,
    followerCount: item.followerCount,
    followeeCount: item.followeeCount,
  };
}

export function toAuthTokenItem(record: AuthTokenRecord): AuthTokenItem {
  return {
    ...record,
    cleanupAt: Math.floor(record.expiresAt / 1000),
  };
}

export function fromAuthTokenItem(item: AuthTokenItem): AuthTokenRecord {
  return {
    token: item.token,
    userAlias: item.userAlias,
    createdAt: item.createdAt,
    lastUsedAt: item.lastUsedAt,
    expiresAt: item.expiresAt,
  };
}

export function toStoryItem(status: StatusDto): StoryItem {
  return {
    authorAlias: status.user.alias,
    timestamp: status.timestamp,
    status,
  };
}

export function toFeedItem(
  ownerAlias: string,
  status: StatusDto,
): FeedItem {
  return {
    ownerAlias,
    feedSortKey: makeFeedSortKey(status),
    status,
  };
}

/**
 * A fixed-width timestamp preserves chronological ordering as a DynamoDB string
 * sort key. The author alias provides a deterministic tie-breaker.
 */
export function makeFeedSortKey(status: StatusDto): string {
  const timestamp = status.timestamp.toString().padStart(16, "0");
  return `${timestamp}#${status.user.alias}`;
}
