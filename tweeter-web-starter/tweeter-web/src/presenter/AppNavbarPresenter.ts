import { UserService } from "../model.service/UserService";
import type { AuthToken } from "tweeter-shared";

export interface AppNavbarView {
  displayInfoMessage: (message: string, duration: number) => number;
  deleteMessage: (toastId: number) => void;
  clearUserInfo: () => void;
  navigate: (path: string) => void;
  displayErrorMessage: (message: string) => void;
}

export class AppNavbarPresenter {
  private service: UserService;
  private view: AppNavbarView;

  public constructor(view: AppNavbarView) {
    this.service = new UserService();
    this.view = view;
  }

  public async logOut(authToken: AuthToken) {
    const loggingOutToastId = this.view.displayInfoMessage("Logging Out...", 0);

    try {
      await this.service.logout(authToken!);

      this.view.deleteMessage(loggingOutToastId);
      this.view.clearUserInfo();
      this.view.navigate("/login");
    } catch (error) {
      this.view.displayErrorMessage(
        `Failed to log user out because of exception: ${error}`,
      );
    }
  }
}
