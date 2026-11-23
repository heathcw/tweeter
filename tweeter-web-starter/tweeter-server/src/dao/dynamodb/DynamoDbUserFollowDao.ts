// AI-assisted: see AI-ATTRIBUTION.md

import {
  BatchGetCommand,
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { FollowDao } from "../FollowDao";
import { DaoPage, UserRecord } from "../PersistenceTypes";
import { UserDao } from "../UserDao";
import { documentClient } from "./DynamoDbClient";
import {
  FollowItem,
  fromUserItem,
  toUserItem,
  UserItem,
} from "./DynamoDbItems";
import {
  followeeIndexName,
  tableNames,
} from "./PersistenceConfig";

const FOLLOWER_COUNT = "followerCount";
const FOLLOWEE_COUNT = "followeeCount";
const MAX_BATCH_GET_SIZE = 100;
const MAX_UNPROCESSED_RETRIES = 5;

/**
 * Owns both Users and Follows persistence. Follow transactions update user
 * counters atomically, so the factory exposes this single DAO instance through
 * the separate UserDao and FollowDao service interfaces.
 */
export class DynamoDbUserFollowDao implements FollowDao, UserDao {
  public constructor(
    private readonly client: DynamoDBDocumentClient = documentClient,
  ) {}

  public async createUser(user: UserRecord): Promise<boolean> {
    try {
      await this.client.send(
        new PutCommand({
          TableName: tableNames.users,
          Item: toUserItem(user),
          ConditionExpression: "attribute_not_exists(#alias)",
          ExpressionAttributeNames: { "#alias": "alias" },
        }),
      );
      return true;
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "ConditionalCheckFailedException"
      ) {
        return false;
      }
      throw error;
    }
  }

  public async getUser(alias: string): Promise<UserRecord | null> {
    const response = await this.client.send(
      new GetCommand({
        TableName: tableNames.users,
        Key: { alias },
        ConsistentRead: true,
      }),
    );
    return response.Item ? fromUserItem(response.Item as UserItem) : null;
  }

  public async deleteUser(alias: string): Promise<void> {
    await this.client.send(
      new DeleteCommand({
        TableName: tableNames.users,
        Key: { alias },
      }),
    );
  }

  public async getUsers(aliases: string[]): Promise<UserRecord[]> {
    if (aliases.length === 0) return [];

    const uniqueAliases = [...new Set(aliases)];
    const recordsByAlias = new Map<string, UserRecord>();
    for (
      let start = 0;
      start < uniqueAliases.length;
      start += MAX_BATCH_GET_SIZE
    ) {
      const batch = uniqueAliases.slice(start, start + MAX_BATCH_GET_SIZE);
      for (const record of await this.getUserBatch(batch)) {
        recordsByAlias.set(record.alias, record);
      }
    }

    return aliases.flatMap((alias) => {
      const record = recordsByAlias.get(alias);
      return record ? [record] : [];
    });
  }

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

  private async getUserBatch(aliases: string[]): Promise<UserRecord[]> {
    const tableName = tableNames.users;
    let pendingKeys = aliases.map((alias) => ({ alias }));
    const records: UserRecord[] = [];

    for (
      let attempt = 0;
      pendingKeys.length > 0 && attempt < MAX_UNPROCESSED_RETRIES;
      attempt++
    ) {
      const response = await this.client.send(
        new BatchGetCommand({
          RequestItems: {
            [tableName]: { Keys: pendingKeys, ConsistentRead: true },
          },
        }),
      );
      const items = (response.Responses?.[tableName] ?? []) as UserItem[];
      records.push(...items.map(fromUserItem));
      pendingKeys =
        (response.UnprocessedKeys?.[tableName]?.Keys as
          | Array<{ alias: string }>
          | undefined) ?? [];
      if (pendingKeys.length > 0) await this.retryDelay(attempt);
    }

    if (pendingKeys.length > 0) {
      throw new Error(
        `DynamoDB did not process ${pendingKeys.length} user keys after retries`,
      );
    }
    return records;
  }

  private async retryDelay(attempt: number): Promise<void> {
    const delayMilliseconds = 25 * 2 ** attempt;
    await new Promise((resolve) => setTimeout(resolve, delayMilliseconds));
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
