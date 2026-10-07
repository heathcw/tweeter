import { StatusItemPresenter, StatusItemView } from "./StatusItemPresenter";
import { StatusService } from "../model.service/StatusService";
import { AuthToken } from "tweeter-shared/dist/model/domain/AuthToken";

export const PAGE_SIZE = 10;

export class StoryPresenter extends StatusItemPresenter {
  private service: StatusService;

  public constructor(view: StatusItemView) {
    super(view);
    this.service = new StatusService();
  }

  public async loadMoreItems(
    authToken: AuthToken,
    userAlias: string,
  ): Promise<void> {
    try {
      const [newItems, hasMore] = await this.service.loadMoreStoryItems(
        authToken,
        userAlias,
        PAGE_SIZE,
        this.lastItem,
      );

      this.hasMoreItems = hasMore;
      this.lastItem =
        newItems.length > 0 ? newItems[newItems.length - 1] : null;
      this.view.addItems(newItems);
    } catch (error) {
      this.view.displayErrorMessage(
        `Failed to load story items because of exception: ${error}`,
      );
    }
  }
}
