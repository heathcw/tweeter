// AI-assisted: see AI-ATTRIBUTION.md

import { StatusDto, UserDto } from "tweeter-shared";

/**
 * The complete user record needed by the service layer. Password hashes never
 * leave the server, so this type is intentionally separate from UserDto.
 */
export interface UserRecord extends UserDto {
  passwordHash: string;
  followerCount: number;
  followeeCount: number;
}

/**
 * Server-side session data. expiresAt is stored in epoch milliseconds for
 * exact authorization checks; a concrete DAO may derive a cleanup timestamp.
 */
export interface AuthTokenRecord {
  token: string;
  userAlias: string;
  createdAt: number;
  lastUsedAt: number;
  expiresAt: number;
}

export interface DaoPage<T> {
  items: T[];
  hasMore: boolean;
}

export interface ImageUpload {
  key: string;
  url: string;
}

/**
 * Feed records contain a status snapshot so displaying a feed does not require
 * an additional user lookup for every status.
 */
export interface FeedRecord {
  ownerAlias: string;
  status: StatusDto;
}
