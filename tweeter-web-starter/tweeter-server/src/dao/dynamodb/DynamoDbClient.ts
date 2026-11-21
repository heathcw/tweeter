// AI-assisted: see AI-ATTRIBUTION.md

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { awsRegion } from "./PersistenceConfig";

const lowLevelClient = new DynamoDBClient({ region: awsRegion });

/**
 * Lambda reuses this client between invocations. The document client lets DAO
 * implementations work with normal JavaScript values instead of AttributeValue
 * wrappers.
 */
export const documentClient = DynamoDBDocumentClient.from(lowLevelClient, {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});
