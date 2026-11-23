// AI-assisted: see AI-ATTRIBUTION.md

import { FakeData, User } from "tweeter-shared";
import { FollowDaoFactory } from "../dao/DaoFactory";
import { UserRecord } from "../dao/PersistenceTypes";
import { AuthorizationService } from "./AuthorizationService";
import { ClientError } from "./ClientError";

export class FollowService {
  public constructor(
    private readonly daoFactory: FollowDaoFactory,
    private readonly authorizationService: AuthorizationService,
  ) {}

  public async loadMoreFollowers(
    token: string,
    userAlias: string,
    pageSize: number,
    lastItem: User | null,
  ): Promise<[User[], boolean]> {
    return this.getPage(token, userAlias, pageSize, lastItem);
  }

  public async loadMoreFollowees(
    token: string,
    userAlias: string,
    pageSize: number,
    lastItem: User | null,
  ): Promise<[User[], boolean]> {
    return this.getPage(token, userAlias, pageSize, lastItem);
  }

  public async follow(
    token: string,
    user: User,
  ): Promise<[followerCount: number, followeeCount: number]> {
    const followerAlias = await this.authorizationService.authorize(token);
    const followeeAlias = this.requireAlias(user);
    this.requireDifferentUsers(followerAlias, followeeAlias, "follow");
    await this.requireExistingUser(followeeAlias);

    const created = await this.daoFactory
      .createFollowDao()
      .createFollow(followerAlias, followeeAlias);
    if (!created) {
      throw new ClientError("You are already following this user");
    }

    return this.getPersistedCounts(followeeAlias);
  }

  public async unfollow(
    token: string,
    user: User,
  ): Promise<[followerCount: number, followeeCount: number]> {
    const followerAlias = await this.authorizationService.authorize(token);
    const followeeAlias = this.requireAlias(user);
    this.requireDifferentUsers(followerAlias, followeeAlias, "unfollow");
    await this.requireExistingUser(followeeAlias);

    const deleted = await this.daoFactory
      .createFollowDao()
      .deleteFollow(followerAlias, followeeAlias);
    if (!deleted) {
      throw new ClientError("You are not following this user");
    }

    return this.getPersistedCounts(followeeAlias);
  }

  public async getFollowerCount(token: string, user: User): Promise<number> {
    this.requireTarget(token, user);
    return await FakeData.instance.getFollowerCount(user.alias);
  }

  public async getFolloweeCount(token: string, user: User): Promise<number> {
    this.requireTarget(token, user);
    return await FakeData.instance.getFolloweeCount(user.alias);
  }

  public async getIsFollowerStatus(
    token: string,
    _user: User,
    selectedUser: User,
  ): Promise<boolean> {
    // The actor comes only from the token; the request's current-user DTO is
    // retained for client compatibility but is never trusted for authorization.
    const followerAlias = await this.authorizationService.authorize(token);
    const followeeAlias = this.requireAlias(selectedUser);
    await this.requireExistingUser(followeeAlias);
    if (followerAlias === followeeAlias) {
      return false;
    }

    return this.daoFactory
      .createFollowDao()
      .isFollower(followerAlias, followeeAlias);
  }

  private async getPersistedCounts(
    alias: string,
  ): Promise<[number, number]> {
    const user = await this.requireExistingUser(alias);
    return [user.followerCount, user.followeeCount];
  }

  private async requireExistingUser(alias: string): Promise<UserRecord> {
    const user = await this.daoFactory.createUserDao().getUser(alias);
    if (!user) {
      throw new ClientError("User does not exist");
    }
    return user;
  }

  private requireDifferentUsers(
    followerAlias: string,
    followeeAlias: string,
    action: "follow" | "unfollow",
  ): void {
    if (followerAlias === followeeAlias) {
      throw new ClientError(`You cannot ${action} yourself`);
    }
  }

  private getPage(
    token: string,
    userAlias: string,
    pageSize: number,
    lastItem: User | null,
  ): [User[], boolean] {
    this.requireText(token, "token");
    this.requireText(userAlias, "user alias");
    if (typeof pageSize !== "number" || pageSize < 1) {
      throw new ClientError("Missing page size");
    }

    return FakeData.instance.getPageOfUsers(lastItem, pageSize, userAlias);
  }

  private requireTarget(token: string, user: User): void {
    this.requireText(token, "token");
    this.requireAlias(user);
  }

  private requireAlias(user: User): string {
    if (
      user == null ||
      typeof user.alias !== "string" ||
      user.alias.trim() === ""
    ) {
      throw new ClientError("Missing user");
    }

    const trimmed = user.alias.trim();
    const normalized = trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
    if (!/^@[A-Za-z0-9]+$/.test(normalized)) {
      throw new ClientError(
        "Alias must contain only letters and numbers",
      );
    }
    return normalized;
  }

  private requireText(value: string, label: string): void {
    if (typeof value !== "string" || value.trim() === "") {
      throw new ClientError(`Missing ${label}`);
    }
  }
}
