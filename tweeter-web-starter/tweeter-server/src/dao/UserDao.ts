// AI-assisted: see AI-ATTRIBUTION.md

import { UserRecord } from "./PersistenceTypes";

export interface UserDao {
  /**
   * Creates a user only when the alias is not already registered.
   *
   * @returns true when created; false when the alias already exists.
   */
  createUser(user: UserRecord): Promise<boolean>;

  getUser(alias: string): Promise<UserRecord | null>;

  /**
   * Returns existing records in the same order as the requested aliases.
   */
  getUsers(aliases: string[]): Promise<UserRecord[]>;
}
