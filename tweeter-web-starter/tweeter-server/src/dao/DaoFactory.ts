// AI-assisted: see AI-ATTRIBUTION.md

import { AuthTokenDao } from "./AuthTokenDao";
import { FeedDao } from "./FeedDao";
import { FollowDao } from "./FollowDao";
import { ImageDao } from "./ImageDao";
import { StoryDao } from "./StoryDao";
import { UserDao } from "./UserDao";

/**
 * Abstract Factory for all persistence dependencies. Services depend only on
 * this interface and therefore do not know whether data is in DynamoDB, an
 * in-memory test store, or another database.
 */
export interface UserDaoFactory {
  createUserDao(): UserDao;
  createAuthTokenDao(): AuthTokenDao;
  createImageDao(): ImageDao;
}

export interface FollowDaoFactory {
  createFollowDao(): FollowDao;
  createUserDao(): UserDao;
  createAuthTokenDao(): AuthTokenDao;
}

export interface StoryDaoFactory {
  createStoryDao(): StoryDao;
  createUserDao(): UserDao;
  createAuthTokenDao(): AuthTokenDao;
}

export interface FeedDaoFactory {
  createFeedDao(): FeedDao;
  createFollowDao(): FollowDao;
  createStoryDao(): StoryDao;
  createUserDao(): UserDao;
  createAuthTokenDao(): AuthTokenDao;
}

export interface DaoFactory
  extends UserDaoFactory,
    FollowDaoFactory,
    StoryDaoFactory,
    FeedDaoFactory {}
