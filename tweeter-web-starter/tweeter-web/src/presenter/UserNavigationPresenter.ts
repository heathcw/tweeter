import { AuthToken, User } from "tweeter-shared";
import { UserService } from "../model.service/UserService";

export class UserNavigationPresenter {
  private userService: UserService;

  public constructor() {
    this.userService = new UserService();
  }

  public async getUser(
    authToken: AuthToken,
    alias: string,
  ): Promise<User | null> {
    // TODO: Replace with the result of calling server
    return this.userService.getUser(authToken, alias);
  }

  public extractAlias(value: string): string {
    const index = value.indexOf("@");
    return value.substring(index);
  }
}
