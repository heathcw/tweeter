import { AuthToken } from "tweeter-shared/dist/model/domain/AuthToken";
import { User } from "tweeter-shared/dist/model/domain/User";

export interface View {
  displayErrorMessage: (message: string) => void;
}

export interface MessageView extends View {
  displayInfoMessage: (
    message: string,
    duration: number,
    bootstrapClasses?: string | undefined,
  ) => string;
  deleteMessage: (messageId: string) => void;
}

export interface AuthView extends View {
  setIsLoading: (isLoading: boolean) => void;
  updateUserInfo: (
    currentUser: User,
    displayedUser: User | null,
    authToken: AuthToken,
    remember: boolean,
  ) => void;
  navigate: (path: string) => void;
}

export abstract class Presenter<V extends View> {
  private _view: V;

  protected constructor(view: V) {
    this._view = view;
  }
  protected async doFailureReportingOperation(
    operation: () => Promise<void>,
    operationDescription: string,
  ) {
    try {
      await operation();
    } catch (error) {
      this._view.displayErrorMessage(
        `Failed to ${operationDescription} because of exception: ${(error as Error).message}`,
      );
    }
  }

  protected get view() {
    return this._view;
  }
}
