// AI-assisted: see AI-ATTRIBUTION.md

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { TweeterResponse } from "tweeter-shared";
import { ClientError } from "../service/ClientError";

// Returned on 200, 400, and 500. API Gateway does not add this header
// to a Lambda proxy response.
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export function parseBody<T>(event: APIGatewayProxyEvent): T {
  if (!event.body) {
    throw new ClientError("Request body is missing");
  }

  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;

  return JSON.parse(raw) as T;
}

export function success<T extends TweeterResponse>(
  body: T,
): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(body),
  };
}

export function failure(error: unknown): APIGatewayProxyResult {
  const message = error instanceof Error ? error.message : "Unknown error";
  const statusCode =
    error instanceof ClientError || error instanceof SyntaxError ? 400 : 500;

  return {
    statusCode,
    headers,
    body: JSON.stringify({ errorMessage: message }),
  };
}
