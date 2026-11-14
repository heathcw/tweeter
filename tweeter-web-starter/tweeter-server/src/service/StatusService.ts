// AI-assisted: see AI-ATTRIBUTION.md

import { FakeData, Status } from "tweeter-shared";
import { ClientError } from "./ClientError";

export class StatusService {
  public async loadMoreFeedItems(
    token: string,
    userAlias: string,
    pageSize: number,
    lastItem: Status | null,
  ): Promise<[Status[], boolean]> {
    return this.getPage(token, userAlias, pageSize, lastItem);
  }

  public async loadMoreStoryItems(
    token: string,
    userAlias: string,
    pageSize: number,
    lastItem: Status | null,
  ): Promise<[Status[], boolean]> {
    return this.getPage(token, userAlias, pageSize, lastItem);
  }

  public async postStatus(token: string, newStatus: Status): Promise<void> {
    this.requireText(token, "token");
    this.requireText(newStatus.post, "post");
    // Milestone 3 accepts the status and does not store it.
  }

  private getPage(
    token: string,
    userAlias: string,
    pageSize: number,
    lastItem: Status | null,
  ): [Status[], boolean] {
    this.requireText(token, "token");
    this.requireText(userAlias, "user alias");
    if (typeof pageSize !== "number" || pageSize < 1) {
      throw new ClientError("Missing page size");
    }

    return FakeData.instance.getPageOfStatuses(lastItem, pageSize);
  }

  private requireText(value: string, label: string): void {
    if (typeof value !== "string" || value.trim() === "") {
      throw new ClientError(`Missing ${label}`);
    }
  }
}
