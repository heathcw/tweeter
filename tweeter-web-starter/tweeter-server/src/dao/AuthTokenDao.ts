// AI-assisted: see AI-ATTRIBUTION.md

import { AuthTokenRecord } from "./PersistenceTypes";

export interface AuthTokenDao {
  /**
   * @returns true when created; false in the unlikely event of a token
   * collision.
   */
  createToken(authToken: AuthTokenRecord): Promise<boolean>;

  getToken(token: string): Promise<AuthTokenRecord | null>;

  updateTokenActivity(
    token: string,
    lastUsedAt: number,
    expiresAt: number,
  ): Promise<boolean>;

  deleteToken(token: string): Promise<void>;
}
