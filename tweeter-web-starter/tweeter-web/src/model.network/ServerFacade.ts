// AI-assisted: see AI-ATTRIBUTION.md

import {
  AuthResponse,
  AuthToken,
  GetUserRequest,
  GetUserResponse,
  LoginRequest,
  LogoutRequest,
  PagedItemRequest,
  PagedItemResponse,
  PostStatusRequest,
  RegisterRequest,
  Status,
  StatusDto,
  TweeterResponse,
  User,
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
