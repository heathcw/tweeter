import { User, AuthToken } from "tweeter-shared";
import { UserService } from "../model.service/UserService";

export interface LoginView {
  setIsLoading: (isLoading: boolean) => void;
  displayErrorMessage: (message: string) => void;
  updateUserInfo: (
    currentUser: User,
    displayedUser: User | null,
    authToken: AuthToken,
    remember: boolean,
  ) => void;
  navigate: (path: string) => void;
}

export class LoginPresenter {
  private service: UserService;
  private view: LoginView;

  public constructor(view: LoginView) {
    this.service = new UserService();
    this.view = view;
  }

  public async doLogin(
    originalUrl: string | null,
    alias: string,
    password: string,
    rememberMe: boolean,
  ) {
    try {
      this.view.setIsLoading(true);

      const [user, authToken] = await this.service.login(alias, password);

      this.view.updateUserInfo(user, user, authToken, rememberMe);

      if (originalUrl) {
        this.view.navigate(originalUrl);
      } else {
        this.view.navigate(`/feed/${user.alias}`);
      }
    } catch (error) {
      this.view.displayErrorMessage(
        `Failed to log user in because of exception: ${error}`,
      );
    } finally {
      this.view.setIsLoading(false);
    }
  }
}
