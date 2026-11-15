// AI-assisted: see AI-ATTRIBUTION.md

import "isomorphic-fetch";
import { AuthToken, Status, Type, User } from "tweeter-shared";
import { StatusService } from "../../src/model.service/StatusService";

const FIRST_POST = `Post 0 0
        My friend @amy likes this website: http://byu.edu. Do you? 
        Or do you prefer this one: http://cs.byu.edu?`;

describe("StatusService integration", () => {
  const statusService = new StatusService();
  const authToken = new AuthToken("integration-test-token", Date.now());

  beforeAll(() => {
    jest.setTimeout(20000);
  });

  it("loads the first page of a story from FakeData", async () => {
    const [statuses, hasMore] = await statusService.loadMoreStoryItems(
      authToken,
      "@allen",
      2,
      null,
    );

    expect(statuses).toHaveLength(2);
    expect(hasMore).toBe(true);

    const first = statuses[0];
    expect(first).toBeInstanceOf(Status);
    expect(first.user).toBeInstanceOf(User);
    expect(first.user.firstName).toBe("Allen");
    expect(first.user.lastName).toBe("Anderson");
    expect(first.user.alias).toBe("@allen");
    expect(first.post).toBe(FIRST_POST);
    expect(first.timestamp).toBe(0);
    expect(first.segments.some((segment) => segment.type === Type.url)).toBe(
      true,
    );

    expect(statuses[1].user.alias).toBe("@amy");
    expect(statuses[1].timestamp).toBe(30000000000);
    expect(statuses[1].post.startsWith("Post 0 1")).toBe(true);
  });
});
