// AI-assisted: see AI-ATTRIBUTION.md

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { AuthResponse, RegisterRequest } from "tweeter-shared";
import {
  DynamoDbAuthTokenDao,
  DynamoDbUserDao,
} from "../dao/dynamodb";
import { S3ImageDao } from "../dao/s3";
import { AuthorizationService } from "../service/AuthorizationService";
import { PasswordHasher } from "../service/PasswordHasher";
import { UserService } from "../service/UserService";
import { failure, parseBody, success } from "./ApiGateway";

const authTokenDao = new DynamoDbAuthTokenDao();
const userService = new UserService({
  userDao: new DynamoDbUserDao(),
  imageDao: new S3ImageDao(),
  authorizationService: new AuthorizationService(authTokenDao),
  passwordHasher: new PasswordHasher(),
});

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
