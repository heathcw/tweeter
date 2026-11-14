// AI-assisted: see AI-ATTRIBUTION.md

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { GetUserRequest, GetUserResponse } from "tweeter-shared";
import { UserService } from "../service/UserService";
import { failure, parseBody, success } from "./ApiGateway";

const userService = new UserService();

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const request = parseBody<GetUserRequest>(event);
    const user = await userService.getUser(request.token, request.alias);

    const response: GetUserResponse = {
      success: true,
      message: null,
      user: user === null ? null : user.toDto(),
    };
    return success(response);
  } catch (error) {
    return failure(error);
  }
};
