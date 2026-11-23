// AI-assisted: see AI-ATTRIBUTION.md

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { TweeterResponse } from "tweeter-shared";
import { ClientError } from "../service/ClientError";
import { UnauthorizedError } from "../service/UnauthorizedError";

// Returned on 200, 400, 401, and 500. API Gateway does not add this header
// to a Lambda proxy response.
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Content-Type": "application/json",
};

export function parseBody<T>(event: APIGatewayProxyEvent): T {
  if (!event.body) {
    throw new ClientError("Request body is missing");
  }

  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;

  const parsed: unknown = JSON.parse(raw);
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    throw new ClientError("Request body must be a JSON object");
  }

  return parsed as T;
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
  let statusCode = 500;
  let message = "Internal server error";
  if (error instanceof UnauthorizedError) {
    statusCode = 401;
    message = error.message;
  } else if (error instanceof ClientError || error instanceof SyntaxError) {
    statusCode = 400;
    message =
      error instanceof SyntaxError
        ? "Request body is not valid JSON"
        : error.message;
  }

  return {
    statusCode,
    headers,
    body: JSON.stringify({ errorMessage: message }),
  };
}
