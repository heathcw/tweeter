// AI-assisted: see AI-ATTRIBUTION.md

import { randomUUID } from "crypto";
import { AuthToken, User } from "tweeter-shared";
import { UserDaoFactory } from "../dao/DaoFactory";
import { InvalidImageError } from "../dao/InvalidImageError";
import { UserRecord } from "../dao/PersistenceTypes";
import { AuthorizationService } from "./AuthorizationService";
import { ClientError } from "./ClientError";
import { PasswordHasher } from "./PasswordHasher";
import { UnauthorizedError } from "./UnauthorizedError";

export class UserService {
  public constructor(
    private readonly daoFactory: UserDaoFactory,
    private readonly authorizationService: AuthorizationService,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  public async register(
    firstName: string,
    lastName: string,
    alias: string,
    password: string,
    userImage: string,
    imageFileExtension: string,
  ): Promise<[User, AuthToken]> {
    this.requireText(firstName, "first name");
    this.requireText(lastName, "last name");
    this.requireText(alias, "alias");
    this.requireText(password, "password");
    this.requireText(imageFileExtension, "image file extension");
    this.requireText(userImage, "user image");

    const userDao = this.daoFactory.createUserDao();
    const normalizedAlias = this.normalizeAlias(alias);
    if (await userDao.getUser(normalizedAlias)) {
      throw new ClientError("Alias is already registered");
    }

    const passwordHash = await this.passwordHasher.hash(password);
    const imageDao = this.daoFactory.createImageDao();
    let imageUpload;

    try {
      imageUpload = await imageDao.putImage(
        `${normalizedAlias.slice(1)}-${randomUUID()}`,
        userImage,
        imageFileExtension,
      );
    } catch (error) {
      if (error instanceof InvalidImageError) {
        throw new ClientError(error.message);
      }
      throw error;
    }

    const user = new User(
      firstName.trim(),
      lastName.trim(),
      normalizedAlias,
      imageUpload.url,
    );
    const userRecord: UserRecord = {
      ...user.toDto(),
      passwordHash,
      followerCount: 0,
      followeeCount: 0,
    };

    let userCreated = false;
    try {
      userCreated = await userDao.createUser(userRecord);
      if (!userCreated) {
        throw new ClientError("Alias is already registered");
      }

      const authToken =
        await this.authorizationService.createSession(normalizedAlias);
      return [user, authToken];
    } catch (error) {
      const cleanup = [imageDao.deleteImage(imageUpload.key)];
      if (userCreated) {
        cleanup.push(userDao.deleteUser(normalizedAlias));
      }
      await Promise.allSettled(cleanup);
      throw error;
    }
  }

  public async login(
    alias: string,
    password: string,
  ): Promise<[User, AuthToken]> {
    this.requireText(alias, "alias");
    this.requireText(password, "password");

    const userDao = this.daoFactory.createUserDao();
    const normalizedAlias = this.normalizeAlias(alias);
    const userRecord = await userDao.getUser(normalizedAlias);
    if (
      !userRecord ||
      !(await this.passwordHasher.compare(
        password,
        userRecord.passwordHash,
      ))
    ) {
      throw new UnauthorizedError("Invalid alias or password");
    }

    const user = new User(
      userRecord.firstName,
      userRecord.lastName,
      userRecord.alias,
      userRecord.imageUrl,
    );
    const authToken = await this.authorizationService.createSession(user.alias);
    return [user, authToken];
  }

  public async logout(token: string): Promise<void> {
    await this.authorizationService.endSession(token);
  }

  public async getUser(token: string, alias: string): Promise<User | null> {
    this.requireText(alias, "alias");
    await this.authorizationService.authorize(token);

    const userRecord = await this.daoFactory
      .createUserDao()
      .getUser(this.normalizeAlias(alias));
    return userRecord
      ? new User(
          userRecord.firstName,
          userRecord.lastName,
          userRecord.alias,
          userRecord.imageUrl,
        )
      : null;
  }

  private requireText(value: string, label: string): void {
    if (typeof value !== "string" || value.trim() === "") {
      throw new ClientError(`Missing ${label}`);
    }
  }

  private normalizeAlias(alias: string): string {
    const trimmed = alias.trim();
    const normalized = trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
    if (!/^@[A-Za-z0-9]+$/.test(normalized)) {
      throw new ClientError(
        "Alias must contain only letters and numbers",
      );
    }
    return normalized;
  }

}
