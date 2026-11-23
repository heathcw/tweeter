// AI-assisted: see AI-ATTRIBUTION.md

import { Status, User } from "tweeter-shared";
import { FeedDaoFactory } from "../dao/DaoFactory";
import { AuthorizationService } from "./AuthorizationService";
import { ClientError } from "./ClientError";

const MAX_STATUS_LENGTH = 280;

export class StatusService {
  public constructor(
    private readonly daoFactory: FeedDaoFactory,
    private readonly authorizationService: AuthorizationService,
  ) {}

  public async loadMoreFeedItems(
    token: string,
    userAlias: string,
    pageSize: number,
    lastItem: Status | null,
  ): Promise<[Status[], boolean]> {
    const actorAlias = await this.authorizationService.authorize(token);
    const normalizedAlias = this.normalizeAlias(userAlias);
    if (actorAlias !== normalizedAlias) {
      throw new ClientError("You can only view your own feed");
    }
    await this.requireExistingUser(normalizedAlias);
    this.requirePageSize(pageSize);
    if (lastItem !== null) {
      this.requireValidStatus(lastItem);
      this.requireAlias(lastItem.user.alias);
    }

    const page = await this.daoFactory.createFeedDao().getFeed(
      normalizedAlias,
      pageSize,
      lastItem?.toDto() ?? null,
    );
    return [page.items.map((dto) => this.toStatus(dto)), page.hasMore];
  }

  public async loadMoreStoryItems(
    token: string,
    userAlias: string,
    pageSize: number,
    lastItem: Status | null,
  ): Promise<[Status[], boolean]> {
    await this.authorizationService.authorize(token);
    const normalizedAlias = this.normalizeAlias(userAlias);
    await this.requireExistingUser(normalizedAlias);
    this.requirePageSize(pageSize);

    if (
      lastItem !== null &&
      this.normalizeAlias(lastItem.user.alias) !== normalizedAlias
    ) {
      throw new ClientError(
        "Last status does not belong to the requested user",
      );
    }

    const page = await this.daoFactory.createStoryDao().getStory(
      normalizedAlias,
      pageSize,
      lastItem?.timestamp ?? null,
    );
    return [
      page.items.map((dto) => {
        const status = Status.fromDto(dto);
        if (status === null) {
          throw new Error("Stored story contains an invalid status");
        }
        return status;
      }),
      page.hasMore,
    ];
  }

  public async postStatus(token: string, newStatus: Status): Promise<void> {
    const actorAlias = await this.authorizationService.authorize(token);
    this.requireValidStatus(newStatus);

    const actor = await this.requireExistingUser(actorAlias);
    const persistedStatus = new Status(
      newStatus.post,
      new User(
        actor.firstName,
        actor.lastName,
        actor.alias,
        actor.imageUrl,
      ),
      newStatus.timestamp,
    );

    try {
      await this.daoFactory
        .createStoryDao()
        .putStatus(persistedStatus.toDto());
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "ConditionalCheckFailedException"
      ) {
        throw new ClientError(
          "A status with this timestamp already exists",
        );
      }
      throw error;
    }

    const followers = await this.daoFactory
      .createFollowDao()
      .getAllFollowerAliases(actorAlias);
    await this.daoFactory.createFeedDao().addStatusToFeeds(
      [actorAlias, ...followers],
      persistedStatus.toDto(),
    );
  }

  private async requireExistingUser(alias: string) {
    const user = await this.daoFactory.createUserDao().getUser(alias);
    if (!user) {
      throw new ClientError("User does not exist");
    }
    return user;
  }

  private requireValidStatus(status: Status): void {
    if (status == null) {
      throw new ClientError("Missing status");
    }
    this.requireText(status.post, "post");
    if (status.post.length > MAX_STATUS_LENGTH) {
      throw new ClientError(
        `Status cannot exceed ${MAX_STATUS_LENGTH} characters`,
      );
    }
    if (
      !Number.isSafeInteger(status.timestamp) ||
      status.timestamp < 0
    ) {
      throw new ClientError("Invalid status timestamp");
    }
    this.requireAlias(status.user.alias);
  }

  private requireAlias(alias: string): string {
    return this.normalizeAlias(alias);
  }

  private toStatus(dto: ReturnType<Status["toDto"]>): Status {
    const status = Status.fromDto(dto);
    if (status === null) {
      throw new Error("Stored feed contains an invalid status");
    }
    return status;
  }

  private normalizeAlias(alias: string): string {
    this.requireText(alias, "user alias");
    const trimmed = alias.trim();
    const normalized = trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
    if (!/^@[A-Za-z0-9]+$/.test(normalized)) {
      throw new ClientError(
        "Alias must contain only letters and numbers",
      );
    }
    return normalized;
  }

  private requirePageSize(pageSize: number): void {
    if (!Number.isInteger(pageSize) || pageSize < 1) {
      throw new ClientError("Page size must be a positive integer");
    }
  }

  private requireText(value: string, label: string): void {
    if (typeof value !== "string" || value.trim() === "") {
      throw new ClientError(`Missing ${label}`);
    }
  }
}
