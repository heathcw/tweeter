// AI-assisted: see AI-ATTRIBUTION.md

import { FakeData, User } from "tweeter-shared";
import { ClientError } from "./ClientError";

export class FollowService {
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
    return this.bothCounts(token, user);
  }

  public async unfollow(
    token: string,
    user: User,
  ): Promise<[followerCount: number, followeeCount: number]> {
    return this.bothCounts(token, user);
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
    user: User,
    selectedUser: User,
  ): Promise<boolean> {
    this.requireTarget(token, user);
    this.requireAlias(selectedUser);
    return FakeData.instance.isFollower();
  }

  private async bothCounts(
    token: string,
    user: User,
  ): Promise<[number, number]> {
    const followerCount = await this.getFollowerCount(token, user);
    const followeeCount = await this.getFolloweeCount(token, user);
    return [followerCount, followeeCount];
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

  private requireAlias(user: User): void {
    if (user == null || typeof user.alias !== "string" || user.alias.trim() === "") {
      throw new ClientError("Missing user");
    }
  }

  private requireText(value: string, label: string): void {
    if (typeof value !== "string" || value.trim() === "") {
      throw new ClientError(`Missing ${label}`);
    }
  }
}
