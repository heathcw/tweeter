// AI-assisted: see AI-ATTRIBUTION.md

import { AuthTokenDao } from "../AuthTokenDao";
import { UserDaoFactory } from "../DaoFactory";
import { ImageDao } from "../ImageDao";
import {
  DynamoDbAuthTokenDao,
  DynamoDbUserDao,
} from "../dynamodb";
import { S3ImageDao } from "../s3";
import { UserDao } from "../UserDao";

/**
 * AWS implementation of the user/session portion of the abstract DAO factory.
 * Additional DAO families are added as their Milestone 4 slices are built.
 */
export class AwsDaoFactory implements UserDaoFactory {
  private userDao: UserDao | undefined;
  private authTokenDao: AuthTokenDao | undefined;
  private imageDao: ImageDao | undefined;

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
}
