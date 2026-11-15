// AI-assisted: see AI-ATTRIBUTION.md

import "isomorphic-fetch";
import { AuthToken, User, UserDto } from "tweeter-shared";
import { ServerFacade } from "../../src/model.network/ServerFacade";

const ALLEN_IMAGE_URL =
  "https://faculty.cs.byu.edu/~jwilkerson/cs340/tweeter/images/donald_duck.png";
const AMY_IMAGE_URL =
  "https://faculty.cs.byu.edu/~jwilkerson/cs340/tweeter/images/daisy_duck.png";
const BOB_IMAGE_URL = ALLEN_IMAGE_URL;

const allen: UserDto = {
  firstName: "Allen",
  lastName: "Anderson",
  alias: "@allen",
  imageUrl: ALLEN_IMAGE_URL,
};

describe("ServerFacade integration", () => {
  const serverFacade = new ServerFacade();

  beforeAll(() => {
    jest.setTimeout(20000);
  });

  it("registers and returns Allen Anderson with an auth token", async () => {
    const [user, authToken] = await serverFacade.register({
      firstName: "Test",
      lastName: "User",
      alias: "@test",
      password: "password",
      userImage: "",
      imageFileExtension: "png",
    });

    expect(user).toBeInstanceOf(User);
    expect(user.firstName).toBe("Allen");
    expect(user.lastName).toBe("Anderson");
    expect(user.alias).toBe("@allen");
    expect(user.imageUrl).toBe(ALLEN_IMAGE_URL);

    expect(authToken).toBeInstanceOf(AuthToken);
    expect(authToken.token.length).toBeGreaterThan(0);
    expect(typeof authToken.timestamp).toBe("number");
  });

  it("returns a page of followers from FakeData", async () => {
    const [followers, hasMore] = await serverFacade.loadMoreFollowers({
      token: "integration-test-token",
      userAlias: "@allen",
      pageSize: 2,
      lastItem: null,
    });

    expect(followers).toHaveLength(2);
    expect(hasMore).toBe(true);

    expect(followers[0]).toBeInstanceOf(User);
    expect(followers[0].firstName).toBe("Amy");
    expect(followers[0].lastName).toBe("Ames");
    expect(followers[0].alias).toBe("@amy");
    expect(followers[0].imageUrl).toBe(AMY_IMAGE_URL);

    expect(followers[1].firstName).toBe("Bob");
    expect(followers[1].lastName).toBe("Bobson");
    expect(followers[1].alias).toBe("@bob");
    expect(followers[1].imageUrl).toBe(BOB_IMAGE_URL);
  });

  it("returns a follower count greater than zero", async () => {
    const count = await serverFacade.getFollowerCount({
      token: "integration-test-token",
      user: allen,
    });

    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(10);
  });
});
