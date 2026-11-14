// AI-assisted: see AI-ATTRIBUTION.md

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  PagedItemRequest,
  PagedItemResponse,
  Status,
  StatusDto,
} from "tweeter-shared";
import { StatusService } from "../service/StatusService";
import { failure, parseBody, success } from "./ApiGateway";
import { ClientError } from "../service/ClientError";

const statusService = new StatusService();

export const handler = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  try {
    const request = parseBody<PagedItemRequest<StatusDto>>(event);
    const [items, hasMore] = await statusService.loadMoreFeedItems(
      request.token,
      request.userAlias,
      request.pageSize,
      toLastStatus(request.lastItem),
    );

    const response: PagedItemResponse<StatusDto> = {
      success: true,
      message: null,
      items: items.map((status) => status.toDto()),
      hasMore: hasMore,
    };
    return success(response);
  } catch (error) {
    return failure(error);
  }
};

function toLastStatus(dto: StatusDto | null): Status | null {
  if (dto == null) {
    return null;
  }
  const status = Status.fromDto(dto);
  if (status === null) {
    throw new ClientError("Invalid last status");
  }
  return status;
}
