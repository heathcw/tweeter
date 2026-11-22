// AI-assisted: see AI-ATTRIBUTION.md

import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { AuthTokenDao } from "../AuthTokenDao";
import { AuthTokenRecord } from "../PersistenceTypes";
import { documentClient } from "./DynamoDbClient";
import {
  AuthTokenItem,
  fromAuthTokenItem,
  toAuthTokenItem,
} from "./DynamoDbItems";
import { tableNames } from "./PersistenceConfig";

export class DynamoDbAuthTokenDao implements AuthTokenDao {
  public constructor(
    private readonly client: DynamoDBDocumentClient = documentClient,
  ) {}

  public async createToken(authToken: AuthTokenRecord): Promise<boolean> {
    try {
      await this.client.send(
        new PutCommand({
          TableName: tableNames.authTokens,
          Item: toAuthTokenItem(authToken),
          ConditionExpression: "attribute_not_exists(#token)",
          ExpressionAttributeNames: {
            "#token": "token",
          },
        }),
      );
      return true;
    } catch (error) {
      if (this.isConditionalCheckFailure(error)) {
        return false;
      }
      throw error;
    }
  }

  public async getToken(token: string): Promise<AuthTokenRecord | null> {
    const response = await this.client.send(
      new GetCommand({
        TableName: tableNames.authTokens,
        Key: { token },
        ConsistentRead: true,
      }),
    );

    return response.Item
      ? fromAuthTokenItem(response.Item as AuthTokenItem)
      : null;
  }

  public async updateTokenActivity(
    token: string,
    lastUsedAt: number,
    expiresAt: number,
  ): Promise<boolean> {
    try {
      await this.client.send(
        new UpdateCommand({
          TableName: tableNames.authTokens,
          Key: { token },
          UpdateExpression:
            "SET #lastUsedAt = :lastUsedAt, #expiresAt = :expiresAt, #cleanupAt = :cleanupAt",
          ConditionExpression:
            "attribute_exists(#token) AND #expiresAt > :lastUsedAt",
          ExpressionAttributeNames: {
            "#token": "token",
            "#lastUsedAt": "lastUsedAt",
            "#expiresAt": "expiresAt",
            "#cleanupAt": "cleanupAt",
          },
          ExpressionAttributeValues: {
            ":lastUsedAt": lastUsedAt,
            ":expiresAt": expiresAt,
            ":cleanupAt": Math.floor(expiresAt / 1000),
          },
        }),
      );
      return true;
    } catch (error) {
      if (this.isConditionalCheckFailure(error)) {
        return false;
      }
      throw error;
    }
  }

  public async deleteToken(token: string): Promise<void> {
    await this.client.send(
      new DeleteCommand({
        TableName: tableNames.authTokens,
        Key: { token },
      }),
    );
  }

  private isConditionalCheckFailure(error: unknown): boolean {
    return (
      error instanceof Error &&
      error.name === "ConditionalCheckFailedException"
    );
  }
}
