// AI-assisted: see AI-ATTRIBUTION.md

import assert from "node:assert/strict";
import { randomBytes } from "crypto";
import { after, before, describe, it } from "node:test";
import { setTimeout as delay } from "timers/promises";
import { DeleteCommand, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { StatusDto, UserDto } from "tweeter-shared";
import { AwsDaoFactory } from "../src/dao/aws/AwsDaoFactory";
import { AuthTokenRecord, DaoPage } from "../src/dao/PersistenceTypes";
import { documentClient } from "../src/dao/dynamodb/DynamoDbClient";
import { makeFeedSortKey } from "../src/dao/dynamodb/DynamoDbItems";
import { tableNames } from "../src/dao/dynamodb/PersistenceConfig";

interface ApiPayload {
  success?: boolean;
  message?: string | null;
  errorMessage?: string;
  user?: UserDto;
  token?: { token: string; timestamp: number };
  followerCount?: number;
  followeeCount?: number;
  count?: number;
  isFollower?: boolean;
  items?: Array<UserDto | StatusDto>;
  hasMore?: boolean;
}

interface ApiResult {
  response: Response;
  payload: ApiPayload;
}

interface TestAccount {
  alias: string;
  password: string;
  firstName: string;
  lastName: string;
  imageUrl: string;
  imageKey: string;
  user: UserDto;
  registrationToken: string;
  token?: string;
}

const integrationEnabled = process.env.RUN_PERSISTENT_API_TESTS === "YES";
const integrationDescribe = integrationEnabled ? describe : describe.skip;
const PROFILE_IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jX1sAAAAASUVORK5CYII=";
const STATUS_COUNT = 12;
const PAGE_SIZE = 5;

integrationDescribe("Persistent deployed Tweeter API", () => {
  let apiUrl = "";
  let factory: AwsDaoFactory | undefined;
  let runId = "";
  let author: TestAccount | undefined;
  let follower: TestAccount | undefined;
  let statuses: StatusDto[] = [];
  const tokens = new Set<string>();

  async function post(endpoint: string, body: unknown): Promise<ApiResult> {
    const response = await fetch(`${apiUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return {
      response,
      payload: (await response.json()) as ApiPayload,
    };
  }

  async function registerAccount(
    alias: string,
    firstName: string,
    lastName: string,
    password: string,
  ): Promise<TestAccount> {
    const { response, payload } = await post("/auth/register", {
      alias,
      firstName,
      lastName,
      password,
      userImage: PROFILE_IMAGE_BASE64,
      imageFileExtension: "png",
    });
    assert.equal(response.status, 200, payload.errorMessage);
    assert.equal(payload.success, true);
    assert.ok(payload.user);
    assert.ok(payload.token?.token);
    const parsedImageUrl = new URL(payload.user.imageUrl);
    const imageKey = decodeURIComponent(parsedImageUrl.pathname.slice(1));
    assert.ok(imageKey.startsWith(`image/${alias.slice(1)}-`));
    tokens.add(payload.token.token);
    return {
      alias,
      password,
      firstName,
      lastName,
      imageUrl: payload.user.imageUrl,
      imageKey,
      user: payload.user,
      registrationToken: payload.token.token,
    };
  }

  async function login(account: TestAccount): Promise<string> {
    const { response, payload } = await post("/auth/login", {
      alias: account.alias,
      password: account.password,
    });
    assert.equal(response.status, 200, payload.errorMessage);
    assert.ok(payload.token?.token);
    tokens.add(payload.token.token);
    account.token = payload.token.token;
    return payload.token.token;
  }

  async function statusPages(
    endpoint: "/status/story" | "/status/feed",
    token: string,
    userAlias: string,
  ): Promise<StatusDto[]> {
    const allStatuses: StatusDto[] = [];
    let lastItem: StatusDto | null = null;
    let hasMore = true;
    while (hasMore) {
      const { response, payload } = await post(endpoint, {
        token,
        userAlias,
        pageSize: PAGE_SIZE,
        lastItem,
      });
      assert.equal(
        response.status,
        200,
        `${endpoint}: ${payload.errorMessage ?? "request failed"}`,
      );
      assert.equal(payload.success, true);
      assert.ok(Array.isArray(payload.items));
      allStatuses.push(...(payload.items as StatusDto[]));
      hasMore = payload.hasMore === true;
      lastItem = (payload.items.at(-1) as StatusDto | undefined) ?? null;
      if (hasMore) assert.ok(lastItem, "a non-final page must contain a cursor");
    }
    return allStatuses;
  }

  async function allStoryStatuses(alias: string): Promise<StatusDto[]> {
    assert.ok(factory);
    const statuses: StatusDto[] = [];
    let cursor: number | null = null;
    let hasMore = true;
    while (hasMore) {
      const page: DaoPage<StatusDto> = await factory
        .createStoryDao()
        .getStory(alias, 100, cursor);
      statuses.push(...page.items);
      cursor = page.items.at(-1)?.timestamp ?? null;
      hasMore = page.hasMore;
    }
    return statuses;
  }

  async function allFeedStatuses(ownerAlias: string): Promise<StatusDto[]> {
    assert.ok(factory);
    const statuses: StatusDto[] = [];
    let cursor: StatusDto | null = null;
    let hasMore = true;
    while (hasMore) {
      const page: DaoPage<StatusDto> = await factory
        .createFeedDao()
        .getFeed(ownerAlias, 100, cursor);
      statuses.push(...page.items);
      cursor = page.items.at(-1) ?? null;
      hasMore = page.hasMore;
    }
    return statuses;
  }

  async function assertNoExternalFeedCopies(): Promise<void> {
    assert.ok(author && follower);
    let exclusiveStartKey: Record<string, unknown> | undefined;
    do {
      const page: {
        Items?: Record<string, unknown>[];
        LastEvaluatedKey?: Record<string, unknown>;
      } = await documentClient.send(
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
            ":authorAlias": author.alias,
            ":followerAlias": follower.alias,
          },
          ProjectionExpression: "#ownerAlias, #status.#user.#alias",
          Limit: 25,
          ConsistentRead: true,
          ExclusiveStartKey: exclusiveStartKey,
        }),
      );
      assert.equal(
        page.Items?.length ?? 0,
        0,
        "test statuses must not be copied into any external feed",
      );
      exclusiveStartKey = page.LastEvaluatedKey;
    } while (exclusiveStartKey);
  }

  async function cleanup(): Promise<void> {
    if (!factory) return;
    if (!author || !follower) {
      for (const account of [author, follower]) {
        if (!account) continue;
        for (const token of tokens) {
          await factory.createAuthTokenDao().deleteToken(token);
        }
        await factory.createImageDao().deleteImage(account.imageKey);
        await factory.createUserDao().deleteUser(account.alias);
      }
      return;
    }
    const users = factory.createUserDao();
    const authorRecord = await users.getUser(author.alias);
    const followerRecord = await users.getUser(follower.alias);
    const follows = factory.createFollowDao();
    const relationExists = await follows.isFollower(
      follower.alias,
      author.alias,
    );

    if (authorRecord || followerRecord) {
      if (
        !authorRecord ||
        !followerRecord ||
        authorRecord.followerCount !== (relationExists ? 1 : 0) ||
        authorRecord.followeeCount !== 0 ||
        followerRecord.followerCount !== 0 ||
        followerRecord.followeeCount !== (relationExists ? 1 : 0)
      ) {
        throw new Error(
          "E2E cleanup stopped: test accounts have relationships outside this run",
        );
      }

      const authorFollowers = await follows.getFollowers(
        author.alias,
        100,
        null,
      );
      const followerFollowees = await follows.getFollowees(
        follower.alias,
        100,
        null,
      );
      if (
        authorFollowers.hasMore ||
        followerFollowees.hasMore ||
        authorFollowers.items.some((alias) => alias !== follower!.alias) ||
        followerFollowees.items.some((alias) => alias !== author!.alias)
      ) {
        throw new Error(
          "E2E cleanup stopped: test accounts have unexpected follow relationships",
        );
      }

      const expectedByTimestamp = new Map(
        statuses.map((status) => [status.timestamp, status.post]),
      );
      for (const status of await allStoryStatuses(author.alias)) {
        if (
          status.user.alias !== author.alias ||
          expectedByTimestamp.get(status.timestamp) !== status.post
        ) {
          throw new Error("E2E cleanup stopped: author story contains unrelated data");
        }
      }
      for (const status of await allStoryStatuses(follower.alias)) {
        throw new Error(
          `E2E cleanup stopped: follower story contains unrelated data (${status.timestamp})`,
        );
      }
      for (const ownerAlias of [author.alias, follower.alias]) {
        for (const status of await allFeedStatuses(ownerAlias)) {
          if (
            status.user.alias !== author.alias ||
            expectedByTimestamp.get(status.timestamp) !== status.post
          ) {
            throw new Error(
              `E2E cleanup stopped: ${ownerAlias} feed contains unrelated data`,
            );
          }
        }
      }
      await assertNoExternalFeedCopies();
    }

    if (relationExists) {
      const deleted = await follows.deleteFollow(follower.alias, author.alias);
      if (!deleted) throw new Error("E2E cleanup could not remove its test follow");
    }
    for (const token of tokens) {
      await factory.createAuthTokenDao().deleteToken(token);
    }
    for (const status of statuses) {
      await documentClient.send(
        new DeleteCommand({
          TableName: tableNames.stories,
          Key: { authorAlias: author.alias, timestamp: status.timestamp },
        }),
      );
      for (const ownerAlias of [author.alias, follower.alias]) {
        await documentClient.send(
          new DeleteCommand({
            TableName: tableNames.feeds,
            Key: {
              ownerAlias,
              feedSortKey: makeFeedSortKey(status),
            },
          }),
        );
      }
    }
    for (const account of [author, follower]) {
      await factory.createImageDao().deleteImage(account.imageKey);
      await users.deleteUser(account.alias);
    }
  }

  before(async () => {
    const required = [
      "TWEETER_API_URL",
      "AWS_REGION",
      "USERS_TABLE_NAME",
      "AUTH_TOKENS_TABLE_NAME",
      "FOLLOWS_TABLE_NAME",
      "STORIES_TABLE_NAME",
      "FEEDS_TABLE_NAME",
      "PROFILE_IMAGES_BUCKET_NAME",
    ];
    const missing = required.filter((name) => !process.env[name]);
    assert.deepEqual(missing, [], "persistent API test configuration is required");
    apiUrl = process.env.TWEETER_API_URL!.replace(/\/$/, "");
    factory = new AwsDaoFactory();
    runId = randomBytes(6).toString("hex");
    const password = `E2e-${randomBytes(12).toString("hex")}!`;
    author = await registerAccount(
      `@e2e${runId}author`,
      "E2E",
      "Author",
      password,
    );
    follower = await registerAccount(
      `@e2e${runId}follower`,
      "E2E",
      "Follower",
      password,
    );
  });

  after(async () => {
    if (integrationEnabled) await cleanup();
  });

  it("registers users with S3 images and rejects duplicate aliases with CORS", async () => {
    assert.ok(author && follower);
    assert.match(author.imageUrl, /^https:\/\/.+\.s3\..+\.amazonaws\.com\//);
    assert.match(follower.imageUrl, /^https:\/\/.+\.s3\..+\.amazonaws\.com\//);
    const profileImage = await fetch(author.imageUrl);
    assert.equal(profileImage.status, 200);
    assert.match(profileImage.headers.get("content-type") ?? "", /^image\/png/);

    const { response, payload } = await post("/auth/register", {
      alias: author.alias,
      firstName: author.firstName,
      lastName: author.lastName,
      password: author.password,
      userImage: PROFILE_IMAGE_BASE64,
      imageFileExtension: "png",
    });
    assert.equal(response.status, 400);
    assert.ok(payload.errorMessage);
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
  });

  it("logs in, rejects invalid credentials, and refreshes the inactivity window", async () => {
    assert.ok(author && follower);
    const badLogin = await post("/auth/login", {
      alias: author.alias,
      password: "incorrect password",
    });
    assert.equal(badLogin.response.status, 401);
    assert.equal(badLogin.response.headers.get("access-control-allow-origin"), "*");

    const authorToken = await login(author);
    await login(follower);
    const userRequest = { token: authorToken, alias: author.alias };
    const initialRead = await post("/user/get", userRequest);
    assert.equal(initialRead.response.status, 200);
    const tokenBefore = await documentClient.send(
      new GetCommand({
        TableName: tableNames.authTokens,
        Key: { token: authorToken },
        ConsistentRead: true,
      }),
    );
    await delay(20);
    const refreshedRead = await post("/user/get", userRequest);
    assert.equal(refreshedRead.response.status, 200);
    const tokenAfter = await documentClient.send(
      new GetCommand({
        TableName: tableNames.authTokens,
        Key: { token: authorToken },
        ConsistentRead: true,
      }),
    );
    const before = tokenBefore.Item as AuthTokenRecord;
    const after = tokenAfter.Item as AuthTokenRecord;
    assert.ok(after.lastUsedAt > before.lastUsedAt);
    assert.ok(after.expiresAt > before.expiresAt);
  });

  it("enforces follow rules, updates counts, and returns both paginated lists", async () => {
    assert.ok(author && follower?.token);
    const follow = await post("/follow", {
      token: follower.token,
      user: author.user,
    });
    assert.equal(follow.response.status, 200, follow.payload.errorMessage);
    assert.equal(follow.payload.followerCount, 1);
    assert.equal(follow.payload.followeeCount, 0);

    const duplicate = await post("/follow", {
      token: follower.token,
      user: author.user,
    });
    assert.equal(duplicate.response.status, 400);
    assert.equal(duplicate.response.headers.get("access-control-allow-origin"), "*");

    const selfFollow = await post("/follow", {
      token: follower.token,
      user: follower.user,
    });
    assert.equal(selfFollow.response.status, 400);

    const isFollower = await post("/follow/isFollower", {
      token: follower.token,
      user: follower.user,
      selectedUser: author.user,
    });
    assert.equal(isFollower.payload.isFollower, true);

    const followerCount = await post("/follower/count", {
      token: author.token,
      user: author.user,
    });
    const followeeCount = await post("/followee/count", {
      token: follower.token,
      user: follower.user,
    });
    assert.equal(followerCount.payload.count, 1);
    assert.equal(followeeCount.payload.count, 1);

    const followers = await post("/follower/list", {
      token: author.token,
      userAlias: author.alias,
      pageSize: 10,
      lastItem: null,
    });
    const followees = await post("/followee/list", {
      token: follower.token,
      userAlias: follower.alias,
      pageSize: 10,
      lastItem: null,
    });
    assert.deepEqual(
      (followers.payload.items as UserDto[]).map((user) => user.alias),
      [follower.alias],
    );
    assert.deepEqual(
      (followees.payload.items as UserDto[]).map((user) => user.alias),
      [author.alias],
    );
  });

  it("pages stories and feeds, preserves old feed items after unfollow, and stops future fan-out", async () => {
    assert.ok(author?.token && follower?.token);
    for (let index = 0; index < STATUS_COUNT; index++) {
      const status: StatusDto = {
        post: `Persistent E2E ${runId} status ${index + 1}`,
        user: author.user,
        timestamp: Date.now() + index,
      };
      statuses.push(status);
      const result = await post("/status/post", {
        token: author.token,
        status,
      });
      assert.equal(result.response.status, 200, result.payload.errorMessage);
    }

    const story = await statusPages("/status/story", author.token, author.alias);
    const authorFeed = await statusPages("/status/feed", author.token, author.alias);
    const followerFeed = await statusPages(
      "/status/feed",
      follower.token,
      follower.alias,
    );
    const expectedTimestamps = statuses
      .map((status) => status.timestamp)
      .sort((left, right) => right - left);
    assert.deepEqual(story.map((status) => status.timestamp), expectedTimestamps);
    assert.deepEqual(authorFeed.map((status) => status.timestamp), expectedTimestamps);
    assert.deepEqual(followerFeed.map((status) => status.timestamp), expectedTimestamps);

    const unfollow = await post("/unfollow", {
      token: follower.token,
      user: author.user,
    });
    assert.equal(unfollow.response.status, 200, unfollow.payload.errorMessage);
    assert.equal(unfollow.payload.followerCount, 0);
    assert.equal(unfollow.payload.followeeCount, 0);
    const repeatedUnfollow = await post("/unfollow", {
      token: follower.token,
      user: author.user,
    });
    assert.equal(repeatedUnfollow.response.status, 400);

    const afterUnfollow = await statusPages(
      "/status/feed",
      follower.token,
      follower.alias,
    );
    assert.deepEqual(
      afterUnfollow.map((status) => status.timestamp),
      expectedTimestamps,
    );

    const finalStatus: StatusDto = {
      post: `Persistent E2E ${runId} after unfollow`,
      user: author.user,
      timestamp: Date.now() + STATUS_COUNT + 10,
    };
    statuses.push(finalStatus);
    const postAfterUnfollow = await post("/status/post", {
      token: author.token,
      status: finalStatus,
    });
    assert.equal(postAfterUnfollow.response.status, 200);
    const followerFeedAfterNewPost = await statusPages(
      "/status/feed",
      follower.token,
      follower.alias,
    );
    assert.deepEqual(
      followerFeedAfterNewPost.map((status) => status.timestamp),
      expectedTimestamps,
    );
  });

  it("returns CORS preflight and error headers, then invalidates the logged-out token", async () => {
    assert.ok(follower?.token && follower.registrationToken);
    const preflight = await fetch(`${apiUrl}/auth/login`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
      },
    });
    assert.ok(preflight.ok);
    assert.equal(preflight.headers.get("access-control-allow-origin"), "*");

    const invalidToken = await post("/user/get", {
      token: "invalid-persistent-e2e-token",
      alias: follower.alias,
    });
    assert.equal(invalidToken.response.status, 401);
    assert.equal(invalidToken.response.headers.get("access-control-allow-origin"), "*");

    const logout = await post("/auth/logout", { token: follower.token });
    assert.equal(logout.response.status, 200, logout.payload.errorMessage);
    tokens.delete(follower.token);
    const afterLogout = await post("/user/get", {
      token: follower.token,
      alias: follower.alias,
    });
    assert.equal(afterLogout.response.status, 401);
    assert.equal(afterLogout.response.headers.get("access-control-allow-origin"), "*");
  });
});
