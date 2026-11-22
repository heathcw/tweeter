// AI-assisted: see AI-ATTRIBUTION.md

export { documentClient } from "./DynamoDbClient";
export { DynamoDbAuthTokenDao } from "./DynamoDbAuthTokenDao";
export { DynamoDbFollowDao } from "./DynamoDbFollowDao";
export { DynamoDbUserDao } from "./DynamoDbUserDao";
export type {
  AuthTokenItem,
  FeedItem,
  FollowItem,
  StoryItem,
  UserItem,
} from "./DynamoDbItems";
export {
  fromAuthTokenItem,
  fromUserItem,
  makeFeedSortKey,
  toAuthTokenItem,
  toFeedItem,
  toStoryItem,
  toUserItem,
} from "./DynamoDbItems";
export {
  awsRegion,
  followeeIndexName,
  tableNames,
} from "./PersistenceConfig";
