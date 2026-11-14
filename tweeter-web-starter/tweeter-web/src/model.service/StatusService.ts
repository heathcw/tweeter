// AI-assisted: see AI-ATTRIBUTION.md

import {
  AuthToken,
  PagedItemRequest,
  PostStatusRequest,
  Status,
  StatusDto,
} from "tweeter-shared";
import { ServerFacade } from "../model.network/ServerFacade";
import { Service } from "./Service";

export class StatusService implements Service {
  private serverFacade = new ServerFacade();

  public async loadMoreFeedItems(
    authToken: AuthToken,
    userAlias: string,
    pageSize: number,
    lastItem: Status | null,
  ): Promise<[Status[], boolean]> {
    return this.serverFacade.loadMoreFeedItems(
      this.pageRequest(authToken, userAlias, pageSize, lastItem),
    );
  }

  public async loadMoreStoryItems(
    authToken: AuthToken,
    userAlias: string,
    pageSize: number,
    lastItem: Status | null,
  ): Promise<[Status[], boolean]> {
    return this.serverFacade.loadMoreStoryItems(
      this.pageRequest(authToken, userAlias, pageSize, lastItem),
    );
  }

  public async postStatus(
    authToken: AuthToken,
    newStatus: Status,
  ): Promise<void> {
    const request: PostStatusRequest = {
      token: authToken.token,
      status: newStatus.toDto(),
    };
    await this.serverFacade.postStatus(request);
  }

  private pageRequest(
    authToken: AuthToken,
    userAlias: string,
    pageSize: number,
    lastItem: Status | null,
  ): PagedItemRequest<StatusDto> {
    return {
      token: authToken.token,
      userAlias: userAlias,
      pageSize: pageSize,
      lastItem: lastItem === null ? null : lastItem.toDto(),
    };
  }
}
