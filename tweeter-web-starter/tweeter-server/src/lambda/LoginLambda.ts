// AI-assisted: see AI-ATTRIBUTION.md

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { AuthResponse, LoginRequest } from "tweeter-shared";
import { failure, parseBody, success } from "./ApiGateway";
import { userService } from "./ServiceProvider";

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const request = parseBody<LoginRequest>(event);
    const [user, token] = await userService.login(
      request.alias,
      request.password,
    );

    const response: AuthResponse = {
      success: true,
      message: null,
      user: user.toDto(),
      token: token.toDto(),
    };
    return success(response);
  } catch (error) {
    return failure(error);
  }
};
