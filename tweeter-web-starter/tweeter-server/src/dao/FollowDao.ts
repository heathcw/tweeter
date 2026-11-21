// AI-assisted: see AI-ATTRIBUTION.md

import { DaoPage } from "./PersistenceTypes";

export interface FollowDao {
  /**
   * Creates the relation and updates both users' counts atomically.
   *
   * @returns false when the relation already exists.
   */
  createFollow(followerAlias: string, followeeAlias: string): Promise<boolean>;

  /**
   * Deletes the relation and updates both users' counts atomically.
   *
   * @returns false when the relation does not exist.
   */
  deleteFollow(followerAlias: string, followeeAlias: string): Promise<boolean>;

  isFollower(followerAlias: string, followeeAlias: string): Promise<boolean>;

  getFollowers(
    followeeAlias: string,
    pageSize: number,
    lastFollowerAlias: string | null,
  ): Promise<DaoPage<string>>;

  getFollowees(
    followerAlias: string,
    pageSize: number,
    lastFolloweeAlias: string | null,
  ): Promise<DaoPage<string>>;

  /**
   * Returns all current followers for status fan-out. Part B can replace this
   * synchronous access pattern without changing the service contract.
   */
  getAllFollowerAliases(followeeAlias: string): Promise<string[]>;
}
