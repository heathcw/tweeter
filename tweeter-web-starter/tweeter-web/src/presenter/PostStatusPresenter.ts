import { AuthToken, Status } from "tweeter-shared";
import { StatusService } from "../model.service/StatusService";
import { MessageView, Presenter } from "./Presenter";

export interface PostStatusView extends MessageView {
  setIsLoading: (isLoading: boolean) => void;
  setPost: (post: string) => void;
}

export class PostStatusPresenter extends Presenter<PostStatusView> {
  private service: StatusService = new StatusService();

  public constructor(view: PostStatusView) {
    super(view);
  }

  public async submitPost(
    event: React.MouseEvent,
    post: string,
    currentUser: any,
    authToken: AuthToken,
  ) {
    event.preventDefault();

    var postingStatusToastId = "";

    this.doFailureReportingOperation(async () => {
      this.view.setIsLoading(true);
      postingStatusToastId = this.view.displayInfoMessage(
        "Posting status...",
        0,
      );

      const status = new Status(post, currentUser!, Date.now());

      await this.service.postStatus(authToken!, status);

      this.view.setPost("");
      this.view.displayInfoMessage("Status posted!", 2000);
    }, "post the status");
    this.view.deleteMessage(postingStatusToastId);
    this.view.setIsLoading(false);
  }
}
