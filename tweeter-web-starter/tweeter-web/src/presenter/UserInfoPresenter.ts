import { AuthToken, User } from "tweeter-shared";
import { FollowService } from "../model.service/FollowService";
import { MessageView, Presenter } from "./Presenter";

export interface UserInfoView extends MessageView {
  setIsLoading: (isLoading: boolean) => void;
  setFolloweeCount: (value: number) => void;
  setFollowerCount: (value: number) => void;
  setIsFollower: (value: boolean) => void;
}

export class UserInfoPresenter extends Presenter<UserInfoView> {
  private followService: FollowService = new FollowService();

  public constructor(view: UserInfoView) {
    super(view);
  }

  public async unfollowDisplayedUser(
    event: React.MouseEvent,
    authToken: AuthToken,
    displayedUser: User,
  ): Promise<void> {
    event.preventDefault();

    var unfollowingUserToast = "";

    await this.doFailureReportingOperation(async () => {
      unfollowingUserToast = await this.interactWithFollowService(
        () => this.followService.unfollow(authToken!, displayedUser!),
        "unfollowing",
        displayedUser!,
      );
    }, "unfollow user");
    this.finallyBlock(unfollowingUserToast);
  }

  public async followDisplayedUser(
    event: React.MouseEvent,
    authToken: AuthToken,
    displayedUser: User,
  ): Promise<void> {
    event.preventDefault();

    var followingUserToast = "";

    await this.doFailureReportingOperation(async () => {
      followingUserToast = await this.interactWithFollowService(
        () => this.followService.follow(authToken!, displayedUser!),
        "following",
        displayedUser!,
      );
    }, "follow user");
    this.finallyBlock(followingUserToast);
  }

  public async setIsFollowerStatus(
    authToken: AuthToken,
    currentUser: User,
    displayedUser: User,
  ) {
    await this.doFailureReportingOperation(async () => {
      if (currentUser === displayedUser) {
        this.view.setIsFollower(false);
      } else {
        this.view.setIsFollower(
          await this.followService.getIsFollowerStatus(
            authToken!,
            currentUser!,
            displayedUser!,
          ),
        );
      }
    }, "determine follower status");
  }

  public async setNumbFollowees(authToken: AuthToken, displayedUser: User) {
    await this.doFailureReportingOperation(async () => {
      this.view.setFolloweeCount(
        await this.followService.getFolloweeCount(authToken, displayedUser),
      );
    }, "get followees count");
  }

  public async setNumbFollowers(authToken: AuthToken, displayedUser: User) {
    await this.doFailureReportingOperation(async () => {
      this.view.setFollowerCount(
        await this.followService.getFollowerCount(authToken, displayedUser),
      );
    }, "get followers count");
  }

  private finallyBlock(message: string) {
    this.view.deleteMessage(message);
    this.view.setIsLoading(false);
  }

  private async interactWithFollowService(asyncOperation: () => Promise<[followerCount: number, followeeCount: number]>, operationDescription: string, displayedUser: User): Promise<string> {
    this.view.setIsLoading(true);
      let UserToast = this.view.displayInfoMessage(
        `${operationDescription} ${displayedUser!.name}...`,
        0,
      );

      const [followerCount, followeeCount] = await asyncOperation();

      this.view.setIsFollower(true);
      this.view.setFollowerCount(followerCount);
      this.view.setFolloweeCount(followeeCount);
      return UserToast;
  }
}
