// AI-assisted: see AI-ATTRIBUTION.md

import {
  AuthResponse,
  AuthToken,
  GetUserRequest,
  GetUserResponse,
  LoginRequest,
  LogoutRequest,
  CountResponse,
  FollowActionResponse,
  IsFollowerRequest,
  IsFollowerResponse,
  PagedItemRequest,
  PagedItemResponse,
  PostStatusRequest,
  RegisterRequest,
  Status,
  StatusDto,
  TargetUserRequest,
  TweeterResponse,
  User,
  UserDto,
} from "tweeter-shared";
import { ClientCommunicator } from "./ClientCommunicator";

export class ServerFacade {
  // ApiUrl from the tweeter stack. No trailing slash.
  private readonly serverUrl =
    "https://iodbhsw2hl.execute-api.us-east-2.amazonaws.com/dev";

  private clientCommunicator = new ClientCommunicator(this.serverUrl);

  public async register(
    request: RegisterRequest,
  ): Promise<[User, AuthToken]> {
    const response = await this.clientCommunicator.doPost<
      RegisterRequest,
      AuthResponse
    >(request, "/auth/register");

    return this.toUserAndToken(response, "Invalid registration");
  }

  public async login(request: LoginRequest): Promise<[User, AuthToken]> {
    const response = await this.clientCommunicator.doPost<
      LoginRequest,
      AuthResponse
    >(request, "/auth/login");

    return this.toUserAndToken(response, "Invalid alias or password");
  }

  public async logout(request: LogoutRequest): Promise<void> {
    const response = await this.clientCommunicator.doPost<
      LogoutRequest,
      TweeterResponse
    >(request, "/auth/logout");

    if (!response.success) {
      console.error(response);
      throw new Error(response.message ?? "Logout failed");
    }
  }

  public async getUser(request: GetUserRequest): Promise<User | null> {
    const response = await this.clientCommunicator.doPost<
      GetUserRequest,
      GetUserResponse
    >(request, "/user/get");

    if (response.success) {
      return User.fromDto(response.user);
    } else {
      console.error(response);
      throw new Error(response.message ?? "Unable to get user");
    }
  }

  public async postStatus(request: PostStatusRequest): Promise<void> {
    const response = await this.clientCommunicator.doPost<
      PostStatusRequest,
      TweeterResponse
    >(request, "/status/post");

    if (!response.success) {
      console.error(response);
      throw new Error(response.message ?? "Post status failed");
    }
  }

  public async loadMoreStoryItems(
    request: PagedItemRequest<StatusDto>,
  ): Promise<[Status[], boolean]> {
    const response = await this.clientCommunicator.doPost<
      PagedItemRequest<StatusDto>,
      PagedItemResponse<StatusDto>
    >(request, "/status/story");

    return this.toStatusPage(response);
  }

  public async loadMoreFeedItems(
    request: PagedItemRequest<StatusDto>,
  ): Promise<[Status[], boolean]> {
    const response = await this.clientCommunicator.doPost<
      PagedItemRequest<StatusDto>,
      PagedItemResponse<StatusDto>
    >(request, "/status/feed");

    return this.toStatusPage(response);
  }

  public async follow(
    request: TargetUserRequest,
  ): Promise<[followerCount: number, followeeCount: number]> {
    return this.followAction(request, "/follow");
  }

  public async unfollow(
    request: TargetUserRequest,
  ): Promise<[followerCount: number, followeeCount: number]> {
    return this.followAction(request, "/unfollow");
  }

  public async getFollowerCount(request: TargetUserRequest): Promise<number> {
    return this.count(request, "/follower/count");
  }

  public async getFolloweeCount(request: TargetUserRequest): Promise<number> {
    return this.count(request, "/followee/count");
  }

  public async getIsFollowerStatus(
    request: IsFollowerRequest,
  ): Promise<boolean> {
    const response = await this.clientCommunicator.doPost<
      IsFollowerRequest,
      IsFollowerResponse
    >(request, "/follow/isFollower");

    if (response.success) {
      return response.isFollower;
    } else {
      console.error(response);
      throw new Error(response.message ?? "Unable to determine follower status");
    }
  }

  public async loadMoreFollowers(
    request: PagedItemRequest<UserDto>,
  ): Promise<[User[], boolean]> {
    return this.userPage(request, "/follower/list");
  }

  public async loadMoreFollowees(
    request: PagedItemRequest<UserDto>,
  ): Promise<[User[], boolean]> {
    return this.userPage(request, "/followee/list");
  }

  private async followAction(
    request: TargetUserRequest,
    endpoint: string,
  ): Promise<[number, number]> {
    const response = await this.clientCommunicator.doPost<
      TargetUserRequest,
      FollowActionResponse
    >(request, endpoint);

    if (response.success) {
      return [response.followerCount, response.followeeCount];
    } else {
      console.error(response);
      throw new Error(response.message ?? "Follow action failed");
    }
  }

  private async count(
    request: TargetUserRequest,
    endpoint: string,
  ): Promise<number> {
    const response = await this.clientCommunicator.doPost<
      TargetUserRequest,
      CountResponse
    >(request, endpoint);

    if (response.success) {
      return response.count;
    } else {
      console.error(response);
      throw new Error(response.message ?? "Unable to get count");
    }
  }

  private async userPage(
    request: PagedItemRequest<UserDto>,
    endpoint: string,
  ): Promise<[User[], boolean]> {
    const response = await this.clientCommunicator.doPost<
      PagedItemRequest<UserDto>,
      PagedItemResponse<UserDto>
    >(request, endpoint);

    if (response.success) {
      if (response.items == null) {
        throw new Error("No users found");
      }
      const items = response.items.map((dto) => {
        const user = User.fromDto(dto);
        if (user === null) {
          throw new Error("Invalid user");
        }
        return user;
      });
      return [items, response.hasMore];
    } else {
      console.error(response);
      throw new Error(response.message ?? "Unable to load users");
    }
  }

  private toStatusPage(
    response: PagedItemResponse<StatusDto>,
  ): [Status[], boolean] {
    if (response.success) {
      if (response.items == null) {
        throw new Error("No statuses found");
      }
      const items = response.items.map((dto) => {
        const status = Status.fromDto(dto);
        if (status === null) {
          throw new Error("Invalid status");
        }
        return status;
      });
      return [items, response.hasMore];
    } else {
      console.error(response);
      throw new Error(response.message ?? "Unable to load statuses");
    }
  }

  private toUserAndToken(
    response: AuthResponse,
    failureMessage: string,
  ): [User, AuthToken] {
    if (response.success) {
      const user = User.fromDto(response.user);
      const token = AuthToken.fromDto(response.token);
      if (user === null || token === null) {
        throw new Error(failureMessage);
      }
      return [user, token];
    } else {
      console.error(response);
      throw new Error(response.message ?? failureMessage);
    }
  }
}
