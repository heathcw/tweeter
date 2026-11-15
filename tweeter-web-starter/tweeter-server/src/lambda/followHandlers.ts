// AI-assisted: see AI-ATTRIBUTION.md

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  CountResponse,
  FollowActionResponse,
  PagedItemRequest,
  PagedItemResponse,
  TargetUserRequest,
  User,
  UserDto,
} from "tweeter-shared";
import { ClientError } from "../service/ClientError";
import { failure, parseBody, success } from "./ApiGateway";

export function toUser(dto: UserDto | null | undefined): User {
  const user = User.fromDto(dto);
  if (user === null) {
    throw new ClientError("Missing user");
  }
  return user;
}

export function countHandler(
  getCount: (token: string, user: User) => Promise<number>,
): (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult> {
  return async (event) => {
    try {
      const request = parseBody<TargetUserRequest>(event);
      const count = await getCount(request.token, toUser(request.user));
      const response: CountResponse = {
        success: true,
        message: null,
        count: count,
      };
      return success(response);
    } catch (error) {
      return failure(error);
    }
  };
}

export function followActionHandler(
  action: (
    token: string,
    user: User,
  ) => Promise<[followerCount: number, followeeCount: number]>,
): (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult> {
  return async (event) => {
    try {
      const request = parseBody<TargetUserRequest>(event);
      const [followerCount, followeeCount] = await action(
        request.token,
        toUser(request.user),
      );
      const response: FollowActionResponse = {
        success: true,
        message: null,
        followerCount: followerCount,
        followeeCount: followeeCount,
      };
      return success(response);
    } catch (error) {
      return failure(error);
    }
  };
}

export function userPageHandler(
  load: (
    token: string,
    userAlias: string,
    pageSize: number,
    lastItem: User | null,
  ) => Promise<[User[], boolean]>,
): (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult> {
  return async (event) => {
    try {
      const request = parseBody<PagedItemRequest<UserDto>>(event);
      const [items, hasMore] = await load(
        request.token,
        request.userAlias,
        request.pageSize,
        request.lastItem == null ? null : toUser(request.lastItem),
      );
      const response: PagedItemResponse<UserDto> = {
        success: true,
        message: null,
        items: items.map((user) => user.toDto()),
        hasMore: hasMore,
      };
      return success(response);
    } catch (error) {
      return failure(error);
    }
  };
}
