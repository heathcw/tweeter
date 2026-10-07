import { AuthToken, User } from "tweeter-shared";
import { UserService } from "../model.service/UserService";

export interface RegisterView {
  setIsLoading: (isLoading: boolean) => void;
  updateUserInfo: (
      currentUser: User,
      displayedUser: User | null,
      authToken: AuthToken,
      remember: boolean,
    ) => void;
  navigate: (path: string) => void;
  displayErrorMessage: (message: string) => void;
}

export class RegisterPresenter {
  private service: UserService;
  private view: RegisterView;

  constructor(view: RegisterView) {
    this.service = new UserService();
    this.view = view;
  }

  public async doRegister(
    firstName: string,
    lastName: string,
    alias: string,
    password: string,
    imageBytes: Uint8Array,
    imageFileExtension: string,
    rememberMe: boolean,
  ) {
    try {
      this.view.setIsLoading(true);

      const [user, authToken] = await this.service.register(
        firstName,
        lastName,
        alias,
        password,
        imageBytes,
        imageFileExtension,
      );

      this.view.updateUserInfo(user, user, authToken, rememberMe);
      this.view.navigate(`/feed/${user.alias}`);
    } catch (error) {
      this.view.displayErrorMessage(
        `Failed to register user because of exception: ${error}`,
      );
    } finally {
      this.view.setIsLoading(false);
    }
  }
}
