// AI-assisted: see AI-ATTRIBUTION.md

import { AuthTokenRecord } from "./PersistenceTypes";

export interface AuthTokenDao {
  createToken(authToken: AuthTokenRecord): Promise<void>;

  getToken(token: string): Promise<AuthTokenRecord | null>;

  updateTokenActivity(
    token: string,
    lastUsedAt: number,
    expiresAt: number,
  ): Promise<boolean>;

  deleteToken(token: string): Promise<void>;
}
