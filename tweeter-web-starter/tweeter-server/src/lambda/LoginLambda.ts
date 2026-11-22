// AI-assisted: see AI-ATTRIBUTION.md

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { AuthResponse, LoginRequest } from "tweeter-shared";
import {
  DynamoDbAuthTokenDao,
  DynamoDbUserDao,
} from "../dao/dynamodb";
import { AuthorizationService } from "../service/AuthorizationService";
import { PasswordHasher } from "../service/PasswordHasher";
import { UserService } from "../service/UserService";
import { failure, parseBody, success } from "./ApiGateway";

const authTokenDao = new DynamoDbAuthTokenDao();
const userService = new UserService({
  userDao: new DynamoDbUserDao(),
  authorizationService: new AuthorizationService(authTokenDao),
  passwordHasher: new PasswordHasher(),
});

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
