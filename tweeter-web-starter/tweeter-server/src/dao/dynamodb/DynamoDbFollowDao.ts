// AI-assisted: see AI-ATTRIBUTION.md

import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { FollowDao } from "../FollowDao";
import { DaoPage } from "../PersistenceTypes";
import { documentClient } from "./DynamoDbClient";
import { FollowItem } from "./DynamoDbItems";
import {
  followeeIndexName,
  tableNames,
} from "./PersistenceConfig";

const FOLLOWER_COUNT = "followerCount";
const FOLLOWEE_COUNT = "followeeCount";

export class DynamoDbFollowDao implements FollowDao {
  public constructor(
    private readonly client: DynamoDBDocumentClient = documentClient,
  ) {}

  public async createFollow(
    followerAlias: string,
    followeeAlias: string,
  ): Promise<boolean> {
    if (await this.isFollower(followerAlias, followeeAlias)) {
      return false;
    }

    try {
      await this.client.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Put: {
                TableName: tableNames.follows,
                Item: { followerAlias, followeeAlias } satisfies FollowItem,
                ConditionExpression:
                  "attribute_not_exists(#followerAlias) AND attribute_not_exists(#followeeAlias)",
                ExpressionAttributeNames: {
                  "#followerAlias": "followerAlias",
                  "#followeeAlias": "followeeAlias",
                },
              },
            },
            this.incrementUserCount(followerAlias, FOLLOWEE_COUNT),
            this.incrementUserCount(followeeAlias, FOLLOWER_COUNT),
          ],
        }),
      );
      return true;
    } catch (error) {
      if (
        this.isTransactionCanceled(error) &&
        (await this.isFollower(followerAlias, followeeAlias))
      ) {
        return false;
      }
      throw error;
    }
  }

  public async deleteFollow(
    followerAlias: string,
    followeeAlias: string,
  ): Promise<boolean> {
    if (!(await this.isFollower(followerAlias, followeeAlias))) {
      return false;
    }

    try {
      await this.client.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Delete: {
                TableName: tableNames.follows,
                Key: { followerAlias, followeeAlias },
                ConditionExpression:
                  "attribute_exists(#followerAlias) AND attribute_exists(#followeeAlias)",
                ExpressionAttributeNames: {
                  "#followerAlias": "followerAlias",
                  "#followeeAlias": "followeeAlias",
                },
              },
            },
            this.decrementUserCount(followerAlias, FOLLOWEE_COUNT),
            this.decrementUserCount(followeeAlias, FOLLOWER_COUNT),
          ],
        }),
      );
      return true;
    } catch (error) {
      if (
        this.isTransactionCanceled(error) &&
        !(await this.isFollower(followerAlias, followeeAlias))
      ) {
        return false;
      }
      throw error;
    }
  }

  public async isFollower(
    followerAlias: string,
    followeeAlias: string,
  ): Promise<boolean> {
    const response = await this.client.send(
      new GetCommand({
        TableName: tableNames.follows,
        Key: { followerAlias, followeeAlias },
        ConsistentRead: true,
      }),
    );
    return response.Item != null;
  }

  public async getFollowers(
    followeeAlias: string,
    pageSize: number,
    lastFollowerAlias: string | null,
  ): Promise<DaoPage<string>> {
    this.validatePageSize(pageSize);

    const response = await this.client.send(
      new QueryCommand({
        TableName: tableNames.follows,
        IndexName: followeeIndexName,
        KeyConditionExpression: "#followeeAlias = :followeeAlias",
        ExpressionAttributeNames: {
          "#followeeAlias": "followeeAlias",
        },
        ExpressionAttributeValues: {
          ":followeeAlias": followeeAlias,
        },
        ExclusiveStartKey: lastFollowerAlias
          ? {
              followerAlias: lastFollowerAlias,
              followeeAlias,
            }
          : undefined,
        Limit: pageSize + 1,
        ScanIndexForward: true,
      }),
    );

    const aliases =
      (response.Items as FollowItem[] | undefined)?.map(
        (item) => item.followerAlias,
      ) ?? [];
    return {
      items: aliases.slice(0, pageSize),
      hasMore: aliases.length > pageSize,
    };
  }

  public async getFollowees(
    followerAlias: string,
    pageSize: number,
    lastFolloweeAlias: string | null,
  ): Promise<DaoPage<string>> {
    this.validatePageSize(pageSize);

    const response = await this.client.send(
      new QueryCommand({
        TableName: tableNames.follows,
        KeyConditionExpression: "#followerAlias = :followerAlias",
        ExpressionAttributeNames: {
          "#followerAlias": "followerAlias",
        },
        ExpressionAttributeValues: {
          ":followerAlias": followerAlias,
        },
        ExclusiveStartKey: lastFolloweeAlias
          ? {
              followerAlias,
              followeeAlias: lastFolloweeAlias,
            }
          : undefined,
        Limit: pageSize + 1,
        ScanIndexForward: true,
        ConsistentRead: true,
      }),
    );

    const aliases =
      (response.Items as FollowItem[] | undefined)?.map(
        (item) => item.followeeAlias,
      ) ?? [];
    return {
      items: aliases.slice(0, pageSize),
      hasMore: aliases.length > pageSize,
    };
  }

  public async getAllFollowerAliases(
    followeeAlias: string,
  ): Promise<string[]> {
    const aliases: string[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined;

    do {
      const response = await this.client.send(
        new QueryCommand({
          TableName: tableNames.follows,
          IndexName: followeeIndexName,
          KeyConditionExpression: "#followeeAlias = :followeeAlias",
          ExpressionAttributeNames: {
            "#followeeAlias": "followeeAlias",
          },
          ExpressionAttributeValues: {
            ":followeeAlias": followeeAlias,
          },
          ExclusiveStartKey: lastEvaluatedKey,
          ProjectionExpression: "followerAlias",
          ScanIndexForward: true,
        }),
      );

      aliases.push(
        ...((response.Items as FollowItem[] | undefined)?.map(
          (item) => item.followerAlias,
        ) ?? []),
      );
      lastEvaluatedKey = response.LastEvaluatedKey;
    } while (lastEvaluatedKey != null);

    return aliases;
  }

  private incrementUserCount(
    alias: string,
    countAttribute: string,
  ): NonNullable<
    ConstructorParameters<typeof TransactWriteCommand>[0]["TransactItems"]
  >[number] {
    return {
      Update: {
        TableName: tableNames.users,
        Key: { alias },
        UpdateExpression: "ADD #count :one",
        ConditionExpression: "attribute_exists(#alias)",
        ExpressionAttributeNames: {
          "#alias": "alias",
          "#count": countAttribute,
        },
        ExpressionAttributeValues: {
          ":one": 1,
        },
      },
    };
  }

  private decrementUserCount(
    alias: string,
    countAttribute: string,
  ): NonNullable<
    ConstructorParameters<typeof TransactWriteCommand>[0]["TransactItems"]
  >[number] {
    return {
      Update: {
        TableName: tableNames.users,
        Key: { alias },
        UpdateExpression: "ADD #count :minusOne",
        ConditionExpression:
          "attribute_exists(#alias) AND #count >= :one",
        ExpressionAttributeNames: {
          "#alias": "alias",
          "#count": countAttribute,
        },
        ExpressionAttributeValues: {
          ":minusOne": -1,
          ":one": 1,
        },
      },
    };
  }

  private validatePageSize(pageSize: number): void {
    if (!Number.isInteger(pageSize) || pageSize < 1) {
      throw new RangeError("Page size must be a positive integer");
    }
  }

  private isTransactionCanceled(error: unknown): boolean {
    return (
      error instanceof Error &&
      error.name === "TransactionCanceledException"
    );
  }
}
