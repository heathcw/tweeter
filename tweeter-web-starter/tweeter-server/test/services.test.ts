// AI-assisted: see AI-ATTRIBUTION.md

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DynamoDBDocumentClient, GetCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import {
  anything,
  deepEqual,
  instance,
  mock,
  verify,
  when,
} from "@typestrong/ts-mockito";
import { Status, User } from "tweeter-shared";
import { AuthTokenDao } from "../src/dao/AuthTokenDao";
import {
  FeedDaoFactory,
  FollowDaoFactory,
  UserDaoFactory,
} from "../src/dao/DaoFactory";
import { FeedDao } from "../src/dao/FeedDao";
import { FollowDao } from "../src/dao/FollowDao";
import { ImageDao } from "../src/dao/ImageDao";
import { StoryDao } from "../src/dao/StoryDao";
import { UserDao } from "../src/dao/UserDao";
import { UserRecord } from "../src/dao/PersistenceTypes";
import { AwsDaoFactory } from "../src/dao/aws/AwsDaoFactory";
import { DynamoDbUserFollowDao } from "../src/dao/dynamodb/DynamoDbUserFollowDao";
import { AuthorizationService } from "../src/service/AuthorizationService";
import { ClientError } from "../src/service/ClientError";
import { FollowService } from "../src/service/FollowService";
import { PasswordHasher } from "../src/service/PasswordHasher";
import { StatusService } from "../src/service/StatusService";
import { UnauthorizedError } from "../src/service/UnauthorizedError";
import { UserService } from "../src/service/UserService";
import { failure } from "../src/lambda/ApiGateway";

const PASSWORD = "correct horse battery staple";

function makeUser(alias: string, overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    firstName: alias.slice(1),
    lastName: "Test",
    alias,
    imageUrl: `memory://images/${alias}`,
    passwordHash: "unused-in-this-test",
    followerCount: 0,
    followeeCount: 0,
    ...overrides,
  };
}

function makeStatus(alias: string, timestamp: number): Status {
  return new Status(
    `status ${timestamp}`,
    new User(alias.slice(1), "Test", alias, `memory://images/${alias}`),
    timestamp,
  );
}

function authorizedAs(alias: string, token = "test-token"): AuthorizationService {
  const tokenDao = mock<AuthTokenDao>();
  when(tokenDao.getToken(token)).thenResolve({
    token,
    userAlias: alias,
    createdAt: 1,
    lastUsedAt: 1,
    expiresAt: Number.MAX_SAFE_INTEGER,
  });
  when(tokenDao.updateTokenActivity(token, anything(), anything())).thenResolve(
    true,
  );
  return new AuthorizationService(instance(tokenDao));
}

describe("UserService", () => {
  it("registration hashes passwords and login rejects incorrect passwords", async () => {
    const userFactoryMock = mock<UserDaoFactory>();
    const userDaoMock = mock<UserDao>();
    const imageDaoMock = mock<ImageDao>();
    const tokenDaoMock = mock<AuthTokenDao>();
    const storedUsers: UserRecord[] = [];

    when(userFactoryMock.createUserDao()).thenReturn(instance(userDaoMock));
    when(userFactoryMock.createImageDao()).thenReturn(instance(imageDaoMock));
    when(userDaoMock.getUser("@newuser")).thenCall(async () => storedUsers[0] ?? null);
    when(userDaoMock.createUser(anything())).thenCall(async (record) => {
      storedUsers.push(record);
      return true;
    });
    when(userDaoMock.deleteUser(anything())).thenResolve(undefined);
    when(
      imageDaoMock.putImage(anything(), anything(), anything()),
    ).thenResolve({ key: "newuser.png", url: "memory://newuser.png" });
    when(imageDaoMock.deleteImage(anything())).thenResolve(undefined);
    when(tokenDaoMock.createToken(anything())).thenResolve(true);

    const service = new UserService(
      instance(userFactoryMock),
      new AuthorizationService(instance(tokenDaoMock)),
      new PasswordHasher(),
    );
    const [registeredUser, registeredToken] = await service.register(
      "New",
      "User",
      "newuser",
      PASSWORD,
      Buffer.from("profile image").toString("base64"),
      "png",
    );

    assert.equal(registeredUser.alias, "@newuser");
    const storedUser = storedUsers[0];
    assert.ok(storedUser);
    assert.notEqual(storedUser.passwordHash, PASSWORD);
    assert.equal(
      await new PasswordHasher().compare(PASSWORD, storedUser.passwordHash),
      true,
    );
    verify(imageDaoMock.putImage(anything(), anything(), "png")).once();

    const [loggedInUser, loginToken] = await service.login("@newuser", PASSWORD);
    assert.equal(loggedInUser.alias, registeredUser.alias);
    assert.notEqual(loginToken.token, registeredToken.token);
    await assert.rejects(
      service.login("@newuser", "incorrect password"),
      UnauthorizedError,
    );
  });
});

describe("AuthorizationService", () => {
  it("slides expiration, rejects expired tokens, and logs out the exact token", async () => {
    const tokenDaoMock = mock<AuthTokenDao>();
    let now = 1_000;
    when(tokenDaoMock.createToken(anything())).thenResolve(true);
    const authorization = new AuthorizationService(
      instance(tokenDaoMock),
      10,
      () => now,
    );

    const token = await authorization.createSession("@alice");
    const createdRecord = {
      token: token.token,
      userAlias: "@alice",
      createdAt: now,
      lastUsedAt: now,
      expiresAt: now + 10 * 60 * 1000,
    };
    now += 5 * 60 * 1000;
    when(tokenDaoMock.getToken(token.token)).thenResolve(createdRecord);
    when(
      tokenDaoMock.updateTokenActivity(
        token.token,
        now,
        now + 10 * 60 * 1000,
      ),
    ).thenResolve(true);

    assert.equal(await authorization.authorize(token.token), "@alice");
    verify(
      tokenDaoMock.updateTokenActivity(
        token.token,
        now,
        now + 10 * 60 * 1000,
      ),
    ).once();

    await authorization.endSession(token.token);
    verify(tokenDaoMock.deleteToken(token.token)).once();

    const expiredDaoMock = mock<AuthTokenDao>();
    when(expiredDaoMock.getToken("expired-token")).thenResolve({
      ...createdRecord,
      token: "expired-token",
      expiresAt: now,
    });
    when(expiredDaoMock.deleteToken("expired-token")).thenResolve(undefined);
    const expiredAuthorization = new AuthorizationService(
      instance(expiredDaoMock),
      10,
      () => now,
    );
    await assert.rejects(
      expiredAuthorization.authorize("expired-token"),
      UnauthorizedError,
    );
    verify(expiredDaoMock.deleteToken("expired-token")).once();
  });
});

describe("FollowService", () => {
  it("rejects duplicate, self, and missing unfollow operations", async () => {
    const factoryMock = mock<FollowDaoFactory>();
    const userDaoMock = mock<UserDao>();
    const followDaoMock = mock<FollowDao>();
    const bob = makeUser("@bob", { followerCount: 1 });
    let followCreated = false;

    when(factoryMock.createUserDao()).thenReturn(instance(userDaoMock));
    when(factoryMock.createFollowDao()).thenReturn(instance(followDaoMock));
    when(userDaoMock.getUser("@bob")).thenResolve(bob);
    when(followDaoMock.createFollow("@alice", "@bob")).thenCall(async () => {
      if (followCreated) return false;
      followCreated = true;
      return true;
    });
    when(followDaoMock.deleteFollow("@alice", "@bob")).thenResolve(false);

    const service = new FollowService(
      instance(factoryMock),
      authorizedAs("@alice"),
    );
    const bobDto = new User("Bob", "Test", "@bob", bob.imageUrl);
    assert.deepEqual(await service.follow("test-token", bobDto), [1, 0]);
    await assert.rejects(service.follow("test-token", bobDto), ClientError);
    await assert.rejects(
      service.follow(
        "test-token",
        new User("Alice", "Test", "@alice", "memory://alice"),
      ),
      ClientError,
    );
    await assert.rejects(service.unfollow("test-token", bobDto), ClientError);

    verify(followDaoMock.createFollow("@alice", "@bob")).twice();
    verify(followDaoMock.createFollow("@alice", "@alice")).never();
    verify(followDaoMock.deleteFollow("@alice", "@bob")).once();
  });
});

describe("DynamoDbUserFollowDao", () => {
  it("couples relationship changes and both counters in transactions", async () => {
    process.env.USERS_TABLE_NAME = "Users";
    process.env.FOLLOWS_TABLE_NAME = "Follows";

    const sentCommands: unknown[] = [];
    const clientMock = mock<DynamoDBDocumentClient>();
    when(clientMock.send(anything())).thenCall((command: unknown) => {
      sentCommands.push(command);
      if (command instanceof GetCommand) {
        return Promise.resolve({ Item: undefined } as never);
      }
      return Promise.resolve({} as never);
    });

    const dao = new DynamoDbUserFollowDao(instance(clientMock));
    assert.equal(await dao.createFollow("@alice", "@bob"), true);
    const createTransaction = sentCommands.find(
      (command): command is TransactWriteCommand =>
        command instanceof TransactWriteCommand,
    );
    assert.ok(createTransaction);
    const createItems = createTransaction.input.TransactItems ?? [];
    assert.equal(createItems.length, 3);
    assert.ok("Put" in createItems[0]);
    assert.equal(createItems[0].Put?.ConditionExpression?.includes("attribute_not_exists"), true);
    const createUpdates = createItems.filter((item) => "Update" in item);
    assert.equal(createUpdates.length, 2);
    assert.deepEqual(
      createUpdates.map((item) => item.Update?.ExpressionAttributeNames?.["#count"]),
      ["followeeCount", "followerCount"],
    );

    const deleteCommands: unknown[] = [];
    const deleteClientMock = mock<DynamoDBDocumentClient>();
    when(deleteClientMock.send(anything())).thenCall((command: unknown) => {
      deleteCommands.push(command);
      if (command instanceof GetCommand) {
        return Promise.resolve({
          Item: { followerAlias: "@alice", followeeAlias: "@bob" },
        } as never);
      }
      return Promise.resolve({} as never);
    });
    assert.equal(
      await new DynamoDbUserFollowDao(instance(deleteClientMock)).deleteFollow(
        "@alice",
        "@bob",
      ),
      true,
    );
    const deleteTransaction = deleteCommands.find(
      (command): command is TransactWriteCommand =>
        command instanceof TransactWriteCommand,
    );
    assert.ok(deleteTransaction);
    const deleteItems = deleteTransaction.input.TransactItems ?? [];
    assert.equal(deleteItems.length, 3);
    assert.ok("Delete" in deleteItems[0]);
    assert.equal(deleteItems[0].Delete?.ConditionExpression?.includes("attribute_exists"), true);
    const deleteUpdates = deleteItems.filter((item) => "Update" in item);
    assert.equal(deleteUpdates.length, 2);
    assert.ok(
      deleteUpdates.every(
        (item) =>
          item.Update?.UpdateExpression?.includes(":minusOne") &&
          item.Update.ConditionExpression?.includes("#count >= :one"),
      ),
    );

    const duplicateCommands: unknown[] = [];
    const duplicateClientMock = mock<DynamoDBDocumentClient>();
    when(duplicateClientMock.send(anything())).thenCall((command: unknown) => {
      duplicateCommands.push(command);
      return Promise.resolve({ Item: { followerAlias: "@alice" } } as never);
    });
    assert.equal(
      await new DynamoDbUserFollowDao(instance(duplicateClientMock)).createFollow(
        "@alice",
        "@bob",
      ),
      false,
    );
    assert.equal(
      duplicateCommands.some((command) => command instanceof TransactWriteCommand),
      false,
    );
  });
});

describe("AwsDaoFactory DAO ownership", () => {
  it("shares one concrete DAO for Users and Follows persistence", () => {
    const factory = new AwsDaoFactory();
    assert.equal(factory.createUserDao(), factory.createFollowDao());
  });
});

describe("Lambda proxy error responses", () => {
  it("maps client, authorization, and internal errors with CORS headers", () => {
    const badRequest = failure(new ClientError("Invalid request"));
    const unauthorized = failure(new UnauthorizedError());
    const internal = failure(new Error("sensitive backend detail"));

    assert.equal(badRequest.statusCode, 400);
    assert.equal(unauthorized.statusCode, 401);
    assert.equal(internal.statusCode, 500);
    assert.equal(badRequest.headers?.["Access-Control-Allow-Origin"], "*");
    assert.equal(unauthorized.headers?.["Access-Control-Allow-Origin"], "*");
    assert.equal(internal.headers?.["Access-Control-Allow-Origin"], "*");
    assert.equal(
      JSON.parse(internal.body).errorMessage,
      "Internal server error",
    );
  });
});

describe("FollowService pagination", () => {
  it("forwards cursors and maps aliases in DAO order", async () => {
    const factoryMock = mock<FollowDaoFactory>();
    const userDaoMock = mock<UserDao>();
    const followDaoMock = mock<FollowDao>();
    when(factoryMock.createUserDao()).thenReturn(instance(userDaoMock));
    when(factoryMock.createFollowDao()).thenReturn(instance(followDaoMock));
    when(userDaoMock.getUser("@alice")).thenResolve(makeUser("@alice"));
    when(userDaoMock.getUsers(anything())).thenCall(async (aliases: string[]) =>
      aliases.map((alias) => makeUser(alias)),
    );
    when(followDaoMock.getFollowees("@alice", 2, null)).thenResolve({
      items: ["@bravo", "@charlie"],
      hasMore: true,
    });
    when(followDaoMock.getFollowees("@alice", 2, "@charlie")).thenResolve({
      items: ["@delta"],
      hasMore: false,
    });

    const service = new FollowService(
      instance(factoryMock),
      authorizedAs("@alice"),
    );
    const [firstPage, hasMore] = await service.loadMoreFollowees(
      "test-token",
      "@alice",
      2,
      null,
    );
    assert.deepEqual(firstPage.map((user) => user.alias), ["@bravo", "@charlie"]);
    assert.equal(hasMore, true);

    const [secondPage, hasMoreAfter] = await service.loadMoreFollowees(
      "test-token",
      "@alice",
      2,
      firstPage.at(-1) ?? null,
    );
    assert.deepEqual(secondPage.map((user) => user.alias), ["@delta"]);
    assert.equal(hasMoreAfter, false);
    verify(followDaoMock.getFollowees("@alice", 2, null)).once();
    verify(followDaoMock.getFollowees("@alice", 2, "@charlie")).once();
  });
});

describe("StatusService pagination", () => {
  it("passes story and feed cursors through to their DAOs", async () => {
    const factoryMock = mock<FeedDaoFactory>();
    const userDaoMock = mock<UserDao>();
    const storyDaoMock = mock<StoryDao>();
    const feedDaoMock = mock<FeedDao>();
    const first = makeStatus("@writer", 20).toDto();
    const second = makeStatus("@writer", 10).toDto();

    when(factoryMock.createUserDao()).thenReturn(instance(userDaoMock));
    when(factoryMock.createStoryDao()).thenReturn(instance(storyDaoMock));
    when(factoryMock.createFeedDao()).thenReturn(instance(feedDaoMock));
    when(userDaoMock.getUser("@writer")).thenResolve(makeUser("@writer"));
    when(userDaoMock.getUser("@viewer")).thenResolve(makeUser("@viewer"));
    when(storyDaoMock.getStory("@writer", 1, null)).thenResolve({
      items: [first],
      hasMore: true,
    });
    when(storyDaoMock.getStory("@writer", 1, 20)).thenResolve({
      items: [second],
      hasMore: false,
    });
    when(feedDaoMock.getFeed("@viewer", 1, null)).thenResolve({
      items: [first],
      hasMore: true,
    });
    when(feedDaoMock.getFeed("@viewer", 1, deepEqual(first))).thenResolve({
      items: [second],
      hasMore: false,
    });

    const service = new StatusService(
      instance(factoryMock),
      authorizedAs("@viewer"),
    );
    const [storyPage] = await service.loadMoreStoryItems(
      "test-token",
      "@writer",
      1,
      null,
    );
    const [nextStoryPage] = await service.loadMoreStoryItems(
      "test-token",
      "@writer",
      1,
      storyPage[0],
    );
    assert.equal(nextStoryPage[0].timestamp, 10);
    verify(storyDaoMock.getStory("@writer", 1, 20)).once();

    const [feedPage] = await service.loadMoreFeedItems(
      "test-token",
      "@viewer",
      1,
      null,
    );
    const [nextFeedPage] = await service.loadMoreFeedItems(
      "test-token",
      "@viewer",
      1,
      feedPage[0],
    );
    assert.equal(nextFeedPage[0].timestamp, 10);
    verify(feedDaoMock.getFeed("@viewer", 1, deepEqual(first))).once();
  });
});

describe("StatusService feed fan-out", () => {
  it("fans out to current followers and keeps old feed entries after unfollow", async () => {
    const statusFactoryMock = mock<FeedDaoFactory>();
    const followFactoryMock = mock<FollowDaoFactory>();
    const userDaoMock = mock<UserDao>();
    const storyDaoMock = mock<StoryDao>();
    const followDaoMock = mock<FollowDao>();
    const feedDaoMock = mock<FeedDao>();
    const events: string[] = [];
    const fanOutCalls: Array<{ owners: string[]; status: ReturnType<Status["toDto"]> }> = [];
    let currentFollowers = ["@follower1", "@follower2"];
    const previousStatus = makeStatus("@writer", 1).toDto();

    when(statusFactoryMock.createUserDao()).thenReturn(instance(userDaoMock));
    when(statusFactoryMock.createStoryDao()).thenReturn(instance(storyDaoMock));
    when(statusFactoryMock.createFollowDao()).thenReturn(instance(followDaoMock));
    when(statusFactoryMock.createFeedDao()).thenReturn(instance(feedDaoMock));
    when(followFactoryMock.createUserDao()).thenReturn(instance(userDaoMock));
    when(followFactoryMock.createFollowDao()).thenReturn(instance(followDaoMock));
    when(userDaoMock.getUser("@writer")).thenResolve(makeUser("@writer"));
    when(userDaoMock.getUser("@follower1")).thenResolve(makeUser("@follower1"));
    when(followDaoMock.getAllFollowerAliases("@writer")).thenCall(async () => {
      events.push("followers");
      return [...currentFollowers];
    });
    when(storyDaoMock.putStatus(anything())).thenCall(async () => {
      events.push("story");
    });
    when(feedDaoMock.addStatusToFeeds(anything(), anything())).thenCall(
      async (owners, status) => {
        events.push("feeds");
        fanOutCalls.push({ owners, status });
      },
    );
    when(followDaoMock.deleteFollow("@follower1", "@writer")).thenCall(
      async () => {
        currentFollowers = currentFollowers.filter(
          (alias) => alias !== "@follower1",
        );
        return true;
      },
    );
    when(feedDaoMock.getFeed("@follower1", 10, null)).thenResolve({
      items: [previousStatus],
      hasMore: false,
    });

    const statusService = new StatusService(
      instance(statusFactoryMock),
      authorizedAs("@writer", "writer-token"),
    );
    const followerStatusService = new StatusService(
      instance(statusFactoryMock),
      authorizedAs("@follower1", "follower-token"),
    );
    const followService = new FollowService(
      instance(followFactoryMock),
      authorizedAs("@follower1", "follower-token"),
    );
    const untrustedStatus = new Status(
      "hello followers",
      new User("Spoofed", "Author", "@attacker", "memory://attacker"),
      2,
    );

    await statusService.postStatus("writer-token", untrustedStatus);
    assert.deepEqual(events, ["story", "followers", "feeds"]);
    assert.equal(fanOutCalls[0].status.user.alias, "@writer");
    assert.deepEqual(fanOutCalls[0].owners, [
      "@writer",
      "@follower1",
      "@follower2",
    ]);

    await followService.unfollow(
      "follower-token",
      new User("Writer", "Test", "@writer", "memory://writer"),
    );
    await statusService.postStatus(
      "writer-token",
      new Status(
        "after unfollow",
        new User("Spoofed", "Author", "@attacker", "memory://attacker"),
        3,
      ),
    );
    assert.deepEqual(fanOutCalls[1].owners, ["@writer", "@follower2"]);

    const [historicalFeed] = await followerStatusService.loadMoreFeedItems(
      "follower-token",
      "@follower1",
      10,
      null,
    );
    assert.equal(historicalFeed[0].timestamp, 1);
    verify(feedDaoMock.getFeed("@follower1", 10, null)).once();
  });
});
