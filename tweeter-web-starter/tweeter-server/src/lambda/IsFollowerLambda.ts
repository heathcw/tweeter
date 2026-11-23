// AI-assisted: see AI-ATTRIBUTION.md

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { IsFollowerRequest, IsFollowerResponse } from "tweeter-shared";
import { failure, parseBody, success } from "./ApiGateway";
import { toUser } from "./followHandlers";
import { followService } from "./ServiceProvider";

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const request = parseBody<IsFollowerRequest>(event);
    const isFollower = await followService.getIsFollowerStatus(
      request.token,
      toUser(request.user),
      toUser(request.selectedUser),
    );
    const response: IsFollowerResponse = {
      success: true,
      message: null,
      isFollower,
    };
    return success(response);
  } catch (error) {
    return failure(error);
  }
};
