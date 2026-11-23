// AI-assisted: see AI-ATTRIBUTION.md

import {
  BatchWriteCommand,
  BatchWriteCommandInput,
  DynamoDBDocumentClient,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { StatusDto } from "tweeter-shared";
import { FeedDao } from "../FeedDao";
import { DaoPage } from "../PersistenceTypes";
import { documentClient } from "./DynamoDbClient";
import {
  FeedItem,
  makeFeedSortKey,
  toFeedItem,
} from "./DynamoDbItems";
import { tableNames } from "./PersistenceConfig";

const MAX_BATCH_WRITE_SIZE = 25;
const MAX_BATCH_WRITE_ATTEMPTS = 9;
type BatchWriteRequest = NonNullable<
  BatchWriteCommandInput["RequestItems"]
>[string][number];

export class DynamoDbFeedDao implements FeedDao {
  public constructor(
    private readonly client: DynamoDBDocumentClient = documentClient,
  ) {}

  public async addStatusToFeeds(
    ownerAliases: string[],
    status: StatusDto,
  ): Promise<void> {
    const uniqueAliases = [...new Set(ownerAliases)];
    const tableName = tableNames.feeds;

    for (
      let start = 0;
      start < uniqueAliases.length;
      start += MAX_BATCH_WRITE_SIZE
    ) {
      let pendingRequests: BatchWriteRequest[] = uniqueAliases
        .slice(start, start + MAX_BATCH_WRITE_SIZE)
        .map((ownerAlias) => ({
          PutRequest: {
            Item: toFeedItem(ownerAlias, status),
          },
        }));

      for (
        let attempt = 0;
        pendingRequests.length > 0 &&
        attempt < MAX_BATCH_WRITE_ATTEMPTS;
        attempt++
      ) {
        const response = await this.client.send(
          new BatchWriteCommand({
            RequestItems: {
              [tableName]: pendingRequests,
            },
          }),
        );
        pendingRequests =
          response.UnprocessedItems?.[tableName] ?? [];

        if (
          pendingRequests.length > 0 &&
          attempt + 1 < MAX_BATCH_WRITE_ATTEMPTS
        ) {
          await this.retryDelay(attempt);
        }
      }

      if (pendingRequests.length > 0) {
        throw new Error(
          `DynamoDB did not process ${pendingRequests.length} feed writes after retries`,
        );
      }
    }
  }

  public async getFeed(
    ownerAlias: string,
    pageSize: number,
    lastStatus: StatusDto | null,
  ): Promise<DaoPage<StatusDto>> {
    this.validatePageSize(pageSize);

    const response = await this.client.send(
      new QueryCommand({
        TableName: tableNames.feeds,
        KeyConditionExpression: "#ownerAlias = :ownerAlias",
        ExpressionAttributeNames: {
          "#ownerAlias": "ownerAlias",
        },
        ExpressionAttributeValues: {
          ":ownerAlias": ownerAlias,
        },
        ExclusiveStartKey:
          lastStatus === null
            ? undefined
            : {
                ownerAlias,
                feedSortKey: makeFeedSortKey(lastStatus),
              },
        Limit: pageSize + 1,
        ScanIndexForward: false,
        ConsistentRead: true,
      }),
    );

    const statuses =
      (response.Items as FeedItem[] | undefined)?.map(
        (item) => item.status,
      ) ?? [];
    return {
      items: statuses.slice(0, pageSize),
      hasMore: statuses.length > pageSize,
    };
  }

  private validatePageSize(pageSize: number): void {
    if (!Number.isInteger(pageSize) || pageSize < 1) {
      throw new RangeError("Page size must be a positive integer");
    }
  }

  private async retryDelay(attempt: number): Promise<void> {
    const delayMilliseconds = 25 * 2 ** attempt;
    await new Promise((resolve) => setTimeout(resolve, delayMilliseconds));
  }
}
