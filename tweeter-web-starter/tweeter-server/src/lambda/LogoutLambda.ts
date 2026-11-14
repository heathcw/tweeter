// AI-assisted: see AI-ATTRIBUTION.md

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { LogoutRequest, TweeterResponse } from "tweeter-shared";
import { UserService } from "../service/UserService";
import { failure, parseBody, success } from "./ApiGateway";

const userService = new UserService();

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const request = parseBody<LogoutRequest>(event);
    await userService.logout(request.token);

    const response: TweeterResponse = {
      success: true,
      message: null,
    };
    return success(response);
  } catch (error) {
    return failure(error);
  }
};
