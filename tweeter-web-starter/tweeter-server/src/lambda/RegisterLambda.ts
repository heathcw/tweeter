// AI-assisted: see AI-ATTRIBUTION.md

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { AuthResponse, RegisterRequest } from "tweeter-shared";
import { failure, parseBody, success } from "./ApiGateway";
import { userService } from "./ServiceProvider";

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const request = parseBody<RegisterRequest>(event);
    const [user, token] = await userService.register(
      request.firstName,
      request.lastName,
      request.alias,
      request.password,
      request.userImage,
      request.imageFileExtension,
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
