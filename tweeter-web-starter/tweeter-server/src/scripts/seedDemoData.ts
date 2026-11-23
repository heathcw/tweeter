// AI-assisted: see AI-ATTRIBUTION.md

import { randomBytes } from "crypto";
import { access, mkdir, readFile, unlink, writeFile } from "fs/promises";
import { resolve } from "path";
import {
  DeleteCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { Status, User } from "tweeter-shared";
import { AwsDaoFactory } from "../dao/aws/AwsDaoFactory";
import { UserRecord } from "../dao/PersistenceTypes";
import { documentClient } from "../dao/dynamodb/DynamoDbClient";
import { makeFeedSortKey } from "../dao/dynamodb/DynamoDbItems";
import { tableNames } from "../dao/dynamodb/PersistenceConfig";
import { AuthorizationService } from "../service/AuthorizationService";
import { FollowService } from "../service/FollowService";
import { PasswordHasher } from "../service/PasswordHasher";
import { StatusService } from "../service/StatusService";
import { UserService } from "../service/UserService";

const STATUS_COUNT = 12;
const PAGE_SIZE = 100;
const SEED_DIRECTORY = resolve(process.cwd(), ".demo-seeds");
const ONE_PIXEL_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX1sAAAAASUVORK5CYII=";

interface DemoAccount {
  alias: string;
  firstName: string;
  lastName: string;
  imageUrl: string | null;
  imageKey: string | null;
}

interface DemoStatus {
  timestamp: number;
  post: string;
}

interface DemoManifest {
  version: 1;
  id: string;
  createdAt: string;
  authorAlias: string;
  followerAlias: string;
  accounts: DemoAccount[];
  statuses: DemoStatus[];
}

function printUsage(): void {
  console.log(
    [
      "Demo data seed and cleanup",
      "",
      "Create 12 story and feed items plus two unique demo accounts:",
      "  npm run seed:demo -- --seed --confirm",
      "",
      "Remove the exact data recorded by a seed run:",
      "  npm run seed:demo -- --cleanup RUN_ID --confirm",
      "",
      "Run from tweeter-server after configuring the AWS credentials and table/bucket environment variables.",
    ].join("\n"),
  );
}

function validateAwsConfiguration(): void {
  const required = [
    "USERS_TABLE_NAME",
    "AUTH_TOKENS_TABLE_NAME",
    "FOLLOWS_TABLE_NAME",
    "STORIES_TABLE_NAME",
    "FEEDS_TABLE_NAME",
    "PROFILE_IMAGES_BUCKET_NAME",
  ];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing AWS configuration: ${missing.join(", ")}`);
  }
}

function manifestPath(id: string): string {
  if (!/^[a-f0-9]{12}$/.test(id)) {
    throw new Error("Run ID must be the 12-character hex ID printed by the seed command");
  }
  return resolve(SEED_DIRECTORY, `${id}.json`);
}

function credentialsPath(id: string): string {
  manifestPath(id);
  return resolve(SEED_DIRECTORY, `${id}.credentials.json`);
}

async function saveManifest(manifest: DemoManifest): Promise<void> {
  await mkdir(SEED_DIRECTORY, { recursive: true });
  await writeFile(
    manifestPath(manifest.id),
    `${JSON.stringify(manifest, null, 2)}\n`,
    { encoding: "utf8", flag: "w" },
  );
}

async function manifestAlreadyExists(id: string): Promise<boolean> {
  try {
    await access(manifestPath(id));
    return true;
  } catch {
    return false;
  }
}

async function credentialsAlreadyExist(id: string): Promise<boolean> {
  try {
    await access(credentialsPath(id));
    return true;
  } catch {
    return false;
  }
}

async function loadManifest(id: string): Promise<DemoManifest> {
  const path = manifestPath(id);
  const manifest = JSON.parse(await readFile(path, "utf8")) as DemoManifest;
  if (
    manifest.version !== 1 ||
    manifest.id !== id ||
    manifest.authorAlias !== `@demo${id}author` ||
    manifest.followerAlias !== `@demo${id}follower` ||
    !Array.isArray(manifest.accounts) ||
    manifest.accounts.length !== 2 ||
    !Array.isArray(manifest.statuses) ||
    manifest.statuses.length !== STATUS_COUNT
  ) {
    throw new Error("The demo manifest is invalid or does not match its run ID");
  }

  const [author, follower] = manifest.accounts;
  if (
    author.alias !== manifest.authorAlias ||
    author.firstName !== "Demo" ||
    author.lastName !== "Author" ||
    follower.alias !== manifest.followerAlias ||
    follower.firstName !== "Demo" ||
    follower.lastName !== "Follower" ||
    (author.imageKey !== null &&
      (!author.imageKey.startsWith(`image/${manifest.authorAlias.slice(1)}-`) ||
        !author.imageKey.endsWith(".png"))) ||
    (follower.imageKey !== null &&
      (!follower.imageKey.startsWith(`image/${manifest.followerAlias.slice(1)}-`) ||
        !follower.imageKey.endsWith(".png"))) ||
    manifest.statuses.some(
      (status, index) =>
        !Number.isSafeInteger(status.timestamp) ||
        status.timestamp < 0 ||
        status.post !==
          `Demo ${id} status ${String(index + 1).padStart(2, "0")} of ${STATUS_COUNT}` ||
        (index > 0 &&
          status.timestamp !== manifest.statuses[index - 1].timestamp + 1_000),
    )
  ) {
    throw new Error("The demo manifest contents do not match the generated seed format");
  }
  return manifest;
}

function imageKeyFromUrl(url: string, alias: string): string {
  const imageUrl = new URL(url);
  const key = decodeURIComponent(imageUrl.pathname.replace(/^\//, ""));
  const expectedPrefix = `image/${alias.slice(1)}-`;
  if (!key.startsWith(expectedPrefix) || !key.endsWith(".png")) {
    throw new Error(`Refusing to manage unexpected profile image URL for ${alias}`);
  }
  return key;
}

async function seedDemoData(): Promise<void> {
  validateAwsConfiguration();
  const factory = new AwsDaoFactory();
  const authorization = new AuthorizationService(factory.createAuthTokenDao());
  const userService = new UserService(factory, authorization, new PasswordHasher());
  const followService = new FollowService(factory, authorization);
  const statusService = new StatusService(factory, authorization);

  let id = randomBytes(6).toString("hex");
  while (
    (await factory.createUserDao().getUser(`@demo${id}author`)) ||
    (await factory.createUserDao().getUser(`@demo${id}follower`)) ||
    (await manifestAlreadyExists(id)) ||
    (await credentialsAlreadyExist(id))
  ) {
    id = randomBytes(6).toString("hex");
  }

  const authorAlias = `@demo${id}author`;
  const followerAlias = `@demo${id}follower`;
  const password = `Demo-${randomBytes(12).toString("hex")}!`;
  const timestampStart = Date.now() - (STATUS_COUNT - 1) * 1_000;
  const manifest: DemoManifest = {
    version: 1,
    id,
    createdAt: new Date().toISOString(),
    authorAlias,
    followerAlias,
    accounts: [
      {
        alias: authorAlias,
        firstName: "Demo",
        lastName: "Author",
        imageUrl: null,
        imageKey: null,
      },
      {
        alias: followerAlias,
        firstName: "Demo",
        lastName: "Follower",
        imageUrl: null,
        imageKey: null,
      },
    ],
    statuses: Array.from({ length: STATUS_COUNT }, (_, index) => ({
      timestamp: timestampStart + index * 1_000,
      post: `Demo ${id} status ${String(index + 1).padStart(2, "0")} of ${STATUS_COUNT}`,
    })),
  };
  await saveManifest(manifest);
  await writeFile(
    credentialsPath(id),
    `${JSON.stringify({
      runId: id,
      authorAlias,
      followerAlias,
      password,
    }, null, 2)}\n`,
    { encoding: "utf8", flag: "wx", mode: 0o600 },
  );

  const sessions: string[] = [];
  try {
    const [author, authorToken] = await userService.register(
      "Demo",
      "Author",
      authorAlias,
      password,
      ONE_PIXEL_PNG,
      "png",
    );
    sessions.push(authorToken.token);
    manifest.accounts[0].imageUrl = author.imageUrl;
    manifest.accounts[0].imageKey = imageKeyFromUrl(
      author.imageUrl,
      authorAlias,
    );
    await saveManifest(manifest);

    const [follower, followerToken] = await userService.register(
      "Demo",
      "Follower",
      followerAlias,
      password,
      ONE_PIXEL_PNG,
      "png",
    );
    sessions.push(followerToken.token);
    manifest.accounts[1].imageUrl = follower.imageUrl;
    manifest.accounts[1].imageKey = imageKeyFromUrl(
      follower.imageUrl,
      followerAlias,
    );
    await saveManifest(manifest);

    await followService.follow(
      followerToken.token,
      new User(author.firstName, author.lastName, author.alias, author.imageUrl),
    );

    for (const status of manifest.statuses) {
      await statusService.postStatus(
        authorToken.token,
        new Status(
          status.post,
          new User(author.firstName, author.lastName, author.alias, author.imageUrl),
          status.timestamp,
        ),
      );
    }
  } catch (error) {
    console.error(`Seed run ${id} did not finish. If it created any data, clean it up with:`);
    console.error(`npm run seed:demo -- --cleanup ${id} --confirm`);
    console.error(`Demo account aliases: ${authorAlias}, ${followerAlias}`);
    console.error(`Shared demo password: ${password}`);
    throw error;
  } finally {
    await Promise.allSettled(
      sessions.map((token) => authorization.endSession(token)),
    );
  }

  console.log(`Demo data created. Run ID: ${id}`);
  console.log(`Author: ${authorAlias}`);
  console.log(`Follower: ${followerAlias}`);
  console.log(`Password for both accounts: ${password}`);
  console.log(`Statuses per story/feed: ${STATUS_COUNT}`);
  console.log(`Cleanup manifest: ${manifestPath(id)}`);
  console.log(`Credentials file: ${credentialsPath(id)}`);
  console.log(`Cleanup command: npm run seed:demo -- --cleanup ${id} --confirm`);
}

async function readAllStories(
  factory: AwsDaoFactory,
  authorAlias: string,
): Promise<Status[]> {
  const statuses: Status[] = [];
  let cursor: number | null = null;
  let hasMore = true;
  while (hasMore) {
    const page = await factory
      .createStoryDao()
      .getStory(authorAlias, PAGE_SIZE, cursor);
    for (const dto of page.items) {
      const status = Status.fromDto(dto);
      if (!status) throw new Error("Stored story contains an invalid status");
      statuses.push(status);
    }
    cursor = page.items.at(-1)?.timestamp ?? null;
    hasMore = page.hasMore;
  }
  return statuses;
}

async function readAllFeed(
  factory: AwsDaoFactory,
  ownerAlias: string,
): Promise<Status[]> {
  const statuses: Status[] = [];
  let cursor: Status | null = null;
  let hasMore = true;
  while (hasMore) {
    const page = await factory
      .createFeedDao()
      .getFeed(ownerAlias, PAGE_SIZE, cursor?.toDto() ?? null);
    for (const dto of page.items) {
      const status = Status.fromDto(dto);
      if (!status) throw new Error("Stored feed contains an invalid status");
      statuses.push(status);
    }
    cursor = statuses.at(-1) ?? null;
    hasMore = page.hasMore;
  }
  return statuses;
}

function assertOnlySeedStatuses(
  location: string,
  statuses: Status[],
  authorAlias: string,
  expected: Map<number, string>,
): void {
  for (const status of statuses) {
    if (
      status.user.alias !== authorAlias ||
      expected.get(status.timestamp) !== status.post
    ) {
      throw new Error(
        `Cleanup stopped: ${location} contains data outside this seed run`,
      );
    }
  }
}

async function findAccountTokens(aliases: string[]): Promise<string[]> {
  const tokens: string[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const page = await documentClient.send(
      new ScanCommand({
        TableName: tableNames.authTokens,
        FilterExpression: "#userAlias IN (:authorAlias, :followerAlias)",
        ExpressionAttributeNames: {
          "#userAlias": "userAlias",
          "#token": "token",
        },
        ExpressionAttributeValues: {
          ":authorAlias": aliases[0],
          ":followerAlias": aliases[1],
        },
        ProjectionExpression: "#token, #userAlias",
        Limit: 25,
        ConsistentRead: true,
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );
    for (const item of page.Items ?? []) {
      if (typeof item.token === "string") tokens.push(item.token);
    }
    exclusiveStartKey = page.LastEvaluatedKey;
  } while (exclusiveStartKey);
  return tokens;
}

async function assertNoExternalFeedCopies(
  authorAlias: string,
  followerAlias: string,
): Promise<void> {
  let exclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const page = await documentClient.send(
      new ScanCommand({
        TableName: tableNames.feeds,
        FilterExpression:
          "#status.#user.#alias = :authorAlias AND #ownerAlias <> :authorAlias AND #ownerAlias <> :followerAlias",
        ExpressionAttributeNames: {
          "#status": "status",
          "#user": "user",
          "#alias": "alias",
          "#ownerAlias": "ownerAlias",
        },
        ExpressionAttributeValues: {
          ":authorAlias": authorAlias,
          ":followerAlias": followerAlias,
        },
        ProjectionExpression: "#ownerAlias, #status.#user.#alias",
        Limit: 25,
        ConsistentRead: true,
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );
    if (page.Items?.length) {
      throw new Error(
        "Cleanup stopped: demo statuses remain in another user's feed, possibly from a previous follow. Remove those copied feed items before cleanup.",
      );
    }
    exclusiveStartKey = page.LastEvaluatedKey;
  } while (exclusiveStartKey);
}

async function cleanupDemoData(id: string): Promise<void> {
  validateAwsConfiguration();
  const manifest = await loadManifest(id);
  const factory = new AwsDaoFactory();
  const author = await factory.createUserDao().getUser(manifest.authorAlias);
  const follower = await factory.createUserDao().getUser(manifest.followerAlias);
  const accounts = new Map(
    manifest.accounts.map((account) => [account.alias, account]),
  );

  for (const record of [author, follower]) {
    if (!record) continue;
    const expected = accounts.get(record.alias);
    if (
      !expected ||
      record.firstName !== expected.firstName ||
      record.lastName !== expected.lastName ||
      (expected.imageUrl !== null && record.imageUrl !== expected.imageUrl)
    ) {
      throw new Error(
        `Cleanup stopped: ${record.alias} no longer matches this seed manifest`,
      );
    }
  }

  const follows = factory.createFollowDao();
  const relationExists = await follows.isFollower(
    manifest.followerAlias,
    manifest.authorAlias,
  );
  if (relationExists && (!author || !follower)) {
    throw new Error("Cleanup stopped: the seeded follow exists but an account is missing");
  }
  if (
    (author &&
      (author.followerCount !== (relationExists ? 1 : 0) ||
        author.followeeCount !== 0)) ||
    (follower &&
      (follower.followerCount !== 0 ||
        follower.followeeCount !== (relationExists ? 1 : 0)))
  ) {
    throw new Error(
      "Cleanup stopped: a demo account has additional follow relationships. Remove them manually before cleanup.",
    );
  }

  const expectedStatuses = new Map(
    manifest.statuses.map((status) => [status.timestamp, status.post]),
  );
  const stories = await readAllStories(factory, manifest.authorAlias);
  assertOnlySeedStatuses("the author story", stories, manifest.authorAlias, expectedStatuses);
  const followerStories = await readAllStories(factory, manifest.followerAlias);
  assertOnlySeedStatuses(
    "the follower story",
    followerStories,
    manifest.authorAlias,
    expectedStatuses,
  );
  const authorFeed = await readAllFeed(factory, manifest.authorAlias);
  assertOnlySeedStatuses("the author feed", authorFeed, manifest.authorAlias, expectedStatuses);
  const followerFeed = await readAllFeed(factory, manifest.followerAlias);
  assertOnlySeedStatuses("the follower feed", followerFeed, manifest.authorAlias, expectedStatuses);
  await assertNoExternalFeedCopies(
    manifest.authorAlias,
    manifest.followerAlias,
  );

  const accountTokens = await findAccountTokens([
    manifest.authorAlias,
    manifest.followerAlias,
  ]);

  if (relationExists) {
    const deleted = await follows.deleteFollow(
      manifest.followerAlias,
      manifest.authorAlias,
    );
    if (!deleted) {
      throw new Error("Cleanup stopped because the seeded follow changed during cleanup");
    }
  }

  for (const token of accountTokens) {
    await factory.createAuthTokenDao().deleteToken(token);
  }

  for (const status of manifest.statuses) {
    await documentClient.send(
      new DeleteCommand({
        TableName: tableNames.stories,
        Key: {
          authorAlias: manifest.authorAlias,
          timestamp: status.timestamp,
        },
      }),
    );
    for (const ownerAlias of [manifest.authorAlias, manifest.followerAlias]) {
      await documentClient.send(
        new DeleteCommand({
          TableName: tableNames.feeds,
          Key: {
            ownerAlias,
            feedSortKey: makeFeedSortKey({
              post: status.post,
              user: {
                firstName: author?.firstName ?? "Demo",
                lastName: author?.lastName ?? "Author",
                alias: manifest.authorAlias,
                imageUrl: author?.imageUrl ?? "",
              },
              timestamp: status.timestamp,
            }),
          },
        }),
      );
    }
  }

  for (const account of manifest.accounts) {
    const record = account.alias === manifest.authorAlias ? author : follower;
    const imageKey =
      account.imageKey ??
      (record?.imageUrl ? imageKeyFromUrl(record.imageUrl, account.alias) : null);
    if (imageKey) {
      await factory.createImageDao().deleteImage(imageKey);
    }
    await factory.createUserDao().deleteUser(account.alias);
  }

  console.log(`Removed demo data for run ${id}.`);
  await unlink(manifestPath(id));
  await unlink(credentialsPath(id)).catch(() => undefined);
  console.log("Removed the local manifest and credentials file.");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.length === 0) {
    printUsage();
    return;
  }

  if (args[0] === "--seed" && args[1] === "--confirm" && args.length === 2) {
    await seedDemoData();
    return;
  }

  if (
    args[0] === "--cleanup" &&
    args[1] &&
    args[2] === "--confirm" &&
    args.length === 3
  ) {
    await cleanupDemoData(args[1]);
    return;
  }

  printUsage();
  process.exitCode = 2;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Demo data command failed");
  process.exitCode = 1;
});
