// AI-assisted: see AI-ATTRIBUTION.md

import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { StatusDto } from "tweeter-shared";
import { StoryDao } from "../StoryDao";
import { DaoPage } from "../PersistenceTypes";
import { documentClient } from "./DynamoDbClient";
import { StoryItem, toStoryItem } from "./DynamoDbItems";
import { tableNames } from "./PersistenceConfig";

export class DynamoDbStoryDao implements StoryDao {
  public constructor(
    private readonly client: DynamoDBDocumentClient = documentClient,
  ) {}

  public async putStatus(status: StatusDto): Promise<void> {
    await this.client.send(
      new PutCommand({
        TableName: tableNames.stories,
        Item: toStoryItem(status),
        ConditionExpression:
          "attribute_not_exists(#authorAlias) AND attribute_not_exists(#timestamp)",
        ExpressionAttributeNames: {
          "#authorAlias": "authorAlias",
          "#timestamp": "timestamp",
        },
      }),
    );
  }

  public async getStory(
    authorAlias: string,
    pageSize: number,
    lastTimestamp: number | null,
  ): Promise<DaoPage<StatusDto>> {
    this.validatePageSize(pageSize);
    if (
      lastTimestamp !== null &&
      (!Number.isFinite(lastTimestamp) || lastTimestamp < 0)
    ) {
      throw new RangeError(
        "Last timestamp must be a non-negative finite number",
      );
    }

    const response = await this.client.send(
      new QueryCommand({
        TableName: tableNames.stories,
        KeyConditionExpression: "#authorAlias = :authorAlias",
        ExpressionAttributeNames: {
          "#authorAlias": "authorAlias",
        },
        ExpressionAttributeValues: {
          ":authorAlias": authorAlias,
        },
        ExclusiveStartKey:
          lastTimestamp === null
            ? undefined
            : {
                authorAlias,
                timestamp: lastTimestamp,
              },
        Limit: pageSize + 1,
        ScanIndexForward: false,
        ConsistentRead: true,
      }),
    );

    const statuses =
      (response.Items as StoryItem[] | undefined)?.map(
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
}
