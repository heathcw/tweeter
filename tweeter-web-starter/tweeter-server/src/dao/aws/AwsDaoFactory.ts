// AI-assisted: see AI-ATTRIBUTION.md

import { AuthTokenDao } from "../AuthTokenDao";
import {
  FeedDaoFactory,
  FollowDaoFactory,
  StoryDaoFactory,
  UserDaoFactory,
} from "../DaoFactory";
import { FeedDao } from "../FeedDao";
import { FollowDao } from "../FollowDao";
import { ImageDao } from "../ImageDao";
import {
  DynamoDbAuthTokenDao,
  DynamoDbFeedDao,
  DynamoDbStoryDao,
  DynamoDbUserFollowDao,
} from "../dynamodb";
import { S3ImageDao } from "../s3";
import { StoryDao } from "../StoryDao";
import { UserDao } from "../UserDao";

/**
 * AWS implementation of the abstract DAO factory. Concrete dependencies are
 * cached so a warm Lambda execution environment reuses its AWS clients.
 */
export class AwsDaoFactory
  implements
    UserDaoFactory,
    FollowDaoFactory,
    StoryDaoFactory,
    FeedDaoFactory
{
  private authTokenDao: AuthTokenDao | undefined;
  private imageDao: ImageDao | undefined;
  private userFollowDao: DynamoDbUserFollowDao | undefined;
  private storyDao: StoryDao | undefined;
  private feedDao: FeedDao | undefined;

  public createUserDao(): UserDao {
    return this.createUserFollowDao();
  }

  public createAuthTokenDao(): AuthTokenDao {
    this.authTokenDao ??= new DynamoDbAuthTokenDao();
    return this.authTokenDao;
  }

  public createImageDao(): ImageDao {
    this.imageDao ??= new S3ImageDao();
    return this.imageDao;
  }

  public createFollowDao(): FollowDao {
    return this.createUserFollowDao();
  }

  public createStoryDao(): StoryDao {
    this.storyDao ??= new DynamoDbStoryDao();
    return this.storyDao;
  }

  public createFeedDao(): FeedDao {
    this.feedDao ??= new DynamoDbFeedDao();
    return this.feedDao;
  }

  private createUserFollowDao(): DynamoDbUserFollowDao {
    this.userFollowDao ??= new DynamoDbUserFollowDao();
    return this.userFollowDao;
  }
}
