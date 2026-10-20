import { UserService } from "../model.service/UserService";
import { Presenter, AuthView } from "./Presenter";

export class LoginPresenter extends Presenter<AuthView> {
  private service: UserService = new UserService();

  public constructor(view: AuthView) {
    super(view);
  }

  public async doLogin(
    originalUrl: string | null,
    alias: string,
    password: string,
    rememberMe: boolean,
  ) {
    await this.doFailureReportingOperation(async () => {
      this.view.setIsLoading(true);

      const [user, authToken] = await this.service.login(alias, password);

      this.view.updateUserInfo(user, user, authToken, rememberMe);

      if (originalUrl) {
        this.view.navigate(originalUrl);
      } else {
        this.view.navigate(`/feed/${user.alias}`);
      }
    }, "log user in");
    this.view.setIsLoading(false);
  }
}
