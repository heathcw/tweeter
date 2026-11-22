// AI-assisted: see AI-ATTRIBUTION.md

import { AuthToken } from "tweeter-shared";
import { AuthTokenDao } from "../dao/AuthTokenDao";
import { AuthTokenRecord } from "../dao/PersistenceTypes";
import { UnauthorizedError } from "./UnauthorizedError";

const DEFAULT_INACTIVITY_MINUTES = 10;
const MAX_TOKEN_GENERATION_ATTEMPTS = 3;

type Clock = () => number;

export class AuthorizationService {
  private readonly inactivityMilliseconds: number;

  public constructor(
    private readonly authTokenDao: AuthTokenDao,
    inactivityMinutes = AuthorizationService.configuredInactivityMinutes(),
    private readonly clock: Clock = Date.now,
  ) {
    if (!Number.isFinite(inactivityMinutes) || inactivityMinutes <= 0) {
      throw new Error("Token inactivity minutes must be greater than zero");
    }
    this.inactivityMilliseconds = inactivityMinutes * 60 * 1000;
  }

  public async createSession(userAlias: string): Promise<AuthToken> {
    for (
      let attempt = 0;
      attempt < MAX_TOKEN_GENERATION_ATTEMPTS;
      attempt++
    ) {
      const now = this.clock();
      const generatedToken = AuthToken.Generate();
      const authToken = new AuthToken(generatedToken.token, now);
      const record: AuthTokenRecord = {
        token: authToken.token,
        userAlias,
        createdAt: now,
        lastUsedAt: now,
        expiresAt: now + this.inactivityMilliseconds,
      };

      if (await this.authTokenDao.createToken(record)) {
        return authToken;
      }
    }

    throw new Error("Unable to create a unique authentication token");
  }

  /**
   * Authenticates a token and slides its inactivity window forward.
   *
   * @returns the alias of the signed-in user.
   */
  public async authorize(token: string): Promise<string> {
    const record = await this.requireActiveToken(token);
    const now = this.clock();
    const refreshed = await this.authTokenDao.updateTokenActivity(
      token,
      now,
      now + this.inactivityMilliseconds,
    );

    if (!refreshed) {
      throw new UnauthorizedError();
    }

    return record.userAlias;
  }

  public async endSession(token: string): Promise<void> {
    await this.requireActiveToken(token);
    await this.authTokenDao.deleteToken(token);
  }

  private async requireActiveToken(token: string): Promise<AuthTokenRecord> {
    if (typeof token !== "string" || token.trim() === "") {
      throw new UnauthorizedError();
    }

    const record = await this.authTokenDao.getToken(token);
    if (!record) {
      throw new UnauthorizedError();
    }

    if (record.expiresAt <= this.clock()) {
      await this.authTokenDao.deleteToken(token);
      throw new UnauthorizedError();
    }

    return record;
  }

  private static configuredInactivityMinutes(): number {
    const configured =
      process.env.TOKEN_INACTIVITY_MINUTES ??
      DEFAULT_INACTIVITY_MINUTES.toString();
    return Number(configured);
  }
}
