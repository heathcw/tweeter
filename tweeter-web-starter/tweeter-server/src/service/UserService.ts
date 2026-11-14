// AI-assisted: see AI-ATTRIBUTION.md

import { AuthToken, FakeData, User } from "tweeter-shared";
import { ClientError } from "./ClientError";

export class UserService {
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
    if (typeof userImage !== "string") {
      throw new ClientError("Missing user image");
    }

    // Milestone 3 does not store the user. The image and password are accepted
    // so the request matches the shape milestone 4 will save.
    const user = FakeData.instance.firstUser;
    if (user === null) {
      throw new Error("Invalid registration");
    }

    return [user, FakeData.instance.authToken];
  }

  private requireText(value: string, label: string): void {
    if (typeof value !== "string" || value.trim() === "") {
      throw new ClientError(`Missing ${label}`);
    }
  }
}
