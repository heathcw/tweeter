// AI-assisted: see AI-ATTRIBUTION.md

import { AuthTokenDao } from "../AuthTokenDao";
import {
  FollowDaoFactory,
  StoryDaoFactory,
  UserDaoFactory,
} from "../DaoFactory";
import { FollowDao } from "../FollowDao";
import { ImageDao } from "../ImageDao";
import {
  DynamoDbAuthTokenDao,
  DynamoDbFollowDao,
  DynamoDbStoryDao,
  DynamoDbUserDao,
} from "../dynamodb";
import { S3ImageDao } from "../s3";
import { StoryDao } from "../StoryDao";
import { UserDao } from "../UserDao";

/**
 * AWS implementation of the currently available abstract DAO families.
 * The feed DAO is added in its later Milestone 4 slice.
 */
export class AwsDaoFactory
  implements UserDaoFactory, FollowDaoFactory, StoryDaoFactory
{
  private userDao: UserDao | undefined;
  private authTokenDao: AuthTokenDao | undefined;
  private imageDao: ImageDao | undefined;
  private followDao: FollowDao | undefined;
  private storyDao: StoryDao | undefined;

  public createUserDao(): UserDao {
    this.userDao ??= new DynamoDbUserDao();
    return this.userDao;
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
    this.followDao ??= new DynamoDbFollowDao();
    return this.followDao;
  }

  public createStoryDao(): StoryDao {
    this.storyDao ??= new DynamoDbStoryDao();
    return this.storyDao;
  }
}
