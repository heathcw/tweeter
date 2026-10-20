import { UserService } from "../model.service/UserService";
import type { AuthToken } from "tweeter-shared";
import { Presenter, MessageView } from "./Presenter";

export interface AppNavbarView extends MessageView {
  clearUserInfo: () => void;
  navigate: (path: string) => void;
}

export class AppNavbarPresenter extends Presenter<AppNavbarView> {
  private service: UserService = new UserService();

  public constructor(view: AppNavbarView) {
    super(view);
  }

  public async logOut(authToken: AuthToken) {
    const loggingOutToastId = this.view.displayInfoMessage("Logging Out...", 0);

    await this.doFailureReportingOperation(async () => {
      await this.service.logout(authToken!);

      this.view.deleteMessage(loggingOutToastId);
      this.view.clearUserInfo();
      this.view.navigate("/login");
    }, "log user out");
  }
}
