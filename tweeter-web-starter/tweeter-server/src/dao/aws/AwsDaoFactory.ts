// AI-assisted: see AI-ATTRIBUTION.md

import { AuthTokenDao } from "../AuthTokenDao";
import {
  FollowDaoFactory,
  UserDaoFactory,
} from "../DaoFactory";
import { FollowDao } from "../FollowDao";
import { ImageDao } from "../ImageDao";
import {
  DynamoDbAuthTokenDao,
  DynamoDbFollowDao,
  DynamoDbUserDao,
} from "../dynamodb";
import { S3ImageDao } from "../s3";
import { UserDao } from "../UserDao";

/**
 * AWS implementation of the currently available abstract DAO families.
 * Story and feed DAOs are added in their later Milestone 4 slices.
 */
export class AwsDaoFactory
  implements UserDaoFactory, FollowDaoFactory
{
  private userDao: UserDao | undefined;
  private authTokenDao: AuthTokenDao | undefined;
  private imageDao: ImageDao | undefined;
  private followDao: FollowDao | undefined;

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
}
