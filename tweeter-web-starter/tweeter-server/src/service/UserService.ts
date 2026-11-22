// AI-assisted: see AI-ATTRIBUTION.md

import { randomUUID } from "crypto";
import { AuthToken, FakeData, User } from "tweeter-shared";
import { ImageDao } from "../dao/ImageDao";
import { InvalidImageError } from "../dao/InvalidImageError";
import { UserRecord } from "../dao/PersistenceTypes";
import { UserDao } from "../dao/UserDao";
import { AuthorizationService } from "./AuthorizationService";
import { ClientError } from "./ClientError";
import { PasswordHasher } from "./PasswordHasher";

export interface UserServiceDependencies {
  userDao: UserDao;
  imageDao: ImageDao;
  authorizationService: AuthorizationService;
  passwordHasher: PasswordHasher;
}

export class UserService {
  public constructor(
    private readonly dependencies?: UserServiceDependencies,
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

    const dependencies = this.requireDependencies();
    const normalizedAlias = this.normalizeAlias(alias);
    if (await dependencies.userDao.getUser(normalizedAlias)) {
      throw new ClientError("Alias is already registered");
    }

    const passwordHash = await dependencies.passwordHasher.hash(password);
    let imageUpload;

    try {
      imageUpload = await dependencies.imageDao.putImage(
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
      userCreated = await dependencies.userDao.createUser(userRecord);
      if (!userCreated) {
        throw new ClientError("Alias is already registered");
      }

      const authToken =
        await dependencies.authorizationService.createSession(normalizedAlias);
      return [user, authToken];
    } catch (error) {
      const cleanup = [dependencies.imageDao.deleteImage(imageUpload.key)];
      if (userCreated) {
        cleanup.push(dependencies.userDao.deleteUser(normalizedAlias));
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

    const user = FakeData.instance.firstUser;
    if (user === null) {
      throw new Error("Invalid alias or password");
    }

    return [user, FakeData.instance.authToken];
  }

  public async logout(token: string): Promise<void> {
    // Milestone 4 will invalidate this token. Milestone 3 only requires it
    // to be present.
    this.requireText(token, "token");
  }

  public async getUser(token: string, alias: string): Promise<User | null> {
    this.requireText(token, "token");
    this.requireText(alias, "alias");
    return FakeData.instance.findUserByAlias(alias);
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

  private requireDependencies(): UserServiceDependencies {
    if (!this.dependencies) {
      throw new Error("UserService persistence dependencies are missing");
    }
    return this.dependencies;
  }
}
