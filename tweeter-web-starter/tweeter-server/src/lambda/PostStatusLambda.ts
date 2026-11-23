// AI-assisted: see AI-ATTRIBUTION.md

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { PostStatusRequest, Status, TweeterResponse } from "tweeter-shared";
import { ClientError } from "../service/ClientError";
import { failure, parseBody, success } from "./ApiGateway";
import { statusService } from "./ServiceProvider";

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const request = parseBody<PostStatusRequest>(event);
    const status = Status.fromDto(request.status);
    if (status === null) {
      throw new ClientError("Missing status");
    }

    await statusService.postStatus(request.token, status);

    const response: TweeterResponse = {
      success: true,
      message: null,
    };
    return success(response);
  } catch (error) {
    return failure(error);
  }
};
