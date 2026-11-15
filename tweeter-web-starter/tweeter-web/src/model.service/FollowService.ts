// AI-assisted: see AI-ATTRIBUTION.md

import {
  AuthToken,
  IsFollowerRequest,
  PagedItemRequest,
  TargetUserRequest,
  User,
  UserDto,
} from "tweeter-shared";
import { ServerFacade } from "../model.network/ServerFacade";
import { Service } from "./Service";

export class FollowService implements Service {
  private serverFacade = new ServerFacade();

  public async loadMoreFollowees(
    authToken: AuthToken,
    userAlias: string,
    pageSize: number,
    lastItem: User | null,
  ): Promise<[User[], boolean]> {
    return this.serverFacade.loadMoreFollowees(
      this.pageRequest(authToken, userAlias, pageSize, lastItem),
    );
  }

  public async loadMoreFollowers(
    authToken: AuthToken,
    userAlias: string,
    pageSize: number,
    lastItem: User | null,
  ): Promise<[User[], boolean]> {
    return this.serverFacade.loadMoreFollowers(
      this.pageRequest(authToken, userAlias, pageSize, lastItem),
    );
  }

  public async unfollow(
    authToken: AuthToken,
    userToUnfollow: User,
  ): Promise<[followerCount: number, followeeCount: number]> {
    return this.serverFacade.unfollow(
      this.targetRequest(authToken, userToUnfollow),
    );
  }

  public async follow(
    authToken: AuthToken,
    userToFollow: User,
  ): Promise<[followerCount: number, followeeCount: number]> {
    return this.serverFacade.follow(this.targetRequest(authToken, userToFollow));
  }

  public async getFollowerCount(
    authToken: AuthToken,
    user: User,
  ): Promise<number> {
    return this.serverFacade.getFollowerCount(
      this.targetRequest(authToken, user),
    );
  }

  public async getFolloweeCount(
    authToken: AuthToken,
    user: User,
  ): Promise<number> {
    return this.serverFacade.getFolloweeCount(
      this.targetRequest(authToken, user),
    );
  }

  public async getIsFollowerStatus(
    authToken: AuthToken,
    user: User,
    selectedUser: User,
  ): Promise<boolean> {
    const request: IsFollowerRequest = {
      token: authToken.token,
      user: user.toDto(),
      selectedUser: selectedUser.toDto(),
    };
    return this.serverFacade.getIsFollowerStatus(request);
  }

  private targetRequest(authToken: AuthToken, user: User): TargetUserRequest {
    return {
      token: authToken.token,
      user: user.toDto(),
    };
  }

  private pageRequest(
    authToken: AuthToken,
    userAlias: string,
    pageSize: number,
    lastItem: User | null,
  ): PagedItemRequest<UserDto> {
    return {
      token: authToken.token,
      userAlias: userAlias,
      pageSize: pageSize,
      lastItem: lastItem === null ? null : lastItem.toDto(),
    };
  }
}
