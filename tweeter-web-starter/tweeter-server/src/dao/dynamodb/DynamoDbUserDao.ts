// AI-assisted: see AI-ATTRIBUTION.md

import {
  BatchGetCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { UserDao } from "../UserDao";
import { UserRecord } from "../PersistenceTypes";
import { documentClient } from "./DynamoDbClient";
import { fromUserItem, toUserItem, UserItem } from "./DynamoDbItems";
import { tableNames } from "./PersistenceConfig";

const MAX_BATCH_GET_SIZE = 100;
const MAX_UNPROCESSED_RETRIES = 5;

export class DynamoDbUserDao implements UserDao {
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
          ExpressionAttributeNames: {
            "#alias": "alias",
          },
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

    return response.Item
      ? fromUserItem(response.Item as UserItem)
      : null;
  }

  public async getUsers(aliases: string[]): Promise<UserRecord[]> {
    if (aliases.length === 0) {
      return [];
    }

    const uniqueAliases = [...new Set(aliases)];
    const recordsByAlias = new Map<string, UserRecord>();

    for (
      let start = 0;
      start < uniqueAliases.length;
      start += MAX_BATCH_GET_SIZE
    ) {
      const aliasBatch = uniqueAliases.slice(
        start,
        start + MAX_BATCH_GET_SIZE,
      );
      const records = await this.getUserBatch(aliasBatch);
      for (const record of records) {
        recordsByAlias.set(record.alias, record);
      }
    }

    return aliases.flatMap((alias) => {
      const record = recordsByAlias.get(alias);
      return record ? [record] : [];
    });
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
            [tableName]: {
              Keys: pendingKeys,
              ConsistentRead: true,
            },
          },
        }),
      );

      const items = (response.Responses?.[tableName] ?? []) as UserItem[];
      records.push(...items.map(fromUserItem));

      pendingKeys =
        (response.UnprocessedKeys?.[tableName]?.Keys as
          | Array<{ alias: string }>
          | undefined) ?? [];

      if (pendingKeys.length > 0) {
        await this.retryDelay(attempt);
      }
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
}
