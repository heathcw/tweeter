import { AuthToken, Status, User } from "tweeter-shared";
import { UserService } from "../model.service/UserService";
import { StatusService } from "../model.service/StatusService";

export interface StatusItemView {
  addItems: (items: Status[]) => void;
  displayErrorMessage: (message: string) => void;
}

export abstract class StatusItemPresenter {
  private _view: StatusItemView;
  private statusService: StatusService;
  private userService: UserService;
  private _hasMoreItems = true;
  private _lastItem: Status | null = null;

  public constructor(view: StatusItemView) {
    this._view = view;
    this.statusService = new StatusService();
    this.userService = new UserService();
  }

  protected get view(): StatusItemView {
    return this._view;
  }

  protected get lastItem(): Status | null {
    return this._lastItem;
  }

  protected set lastItem(value: Status | null) {
    this._lastItem = value;
  }

  public get hasMoreItems(): boolean {
    return this._hasMoreItems;
  }

  protected set hasMoreItems(value: boolean) {
    this._hasMoreItems = value;
  }

  reset() {
    this._lastItem = null;
    this._hasMoreItems = true;
  }

  public abstract loadMoreItems(authToken: AuthToken, userAlias: string): void;

  public async getUser(
    authToken: AuthToken,
    alias: string,
  ): Promise<User | null> {
    // TODO: Replace with the result of calling server
    return this.userService.getUser(authToken, alias);
  }
}