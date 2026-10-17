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

    this.doFailureReportingOperation(async () => {
      this.view.setIsLoading(true);
      unfollowingUserToast = this.view.displayInfoMessage(
        `Unfollowing ${displayedUser!.name}...`,
        0,
      );

      const [followerCount, followeeCount] = await this.followService.unfollow(
        authToken!,
        displayedUser!,
      );

      this.view.setIsFollower(false);
      this.view.setFollowerCount(followerCount);
      this.view.setFolloweeCount(followeeCount);
    }, "unfollow user");
    this.view.deleteMessage(unfollowingUserToast);
    this.view.setIsLoading(false);
  }

  public async followDisplayedUser(
    event: React.MouseEvent,
    authToken: AuthToken,
    displayedUser: User,
  ): Promise<void> {
    event.preventDefault();

    var followingUserToast = "";

    this.doFailureReportingOperation(async () => {
      this.view.setIsLoading(true);
      followingUserToast = this.view.displayInfoMessage(
        `Following ${displayedUser!.name}...`,
        0,
      );

      const [followerCount, followeeCount] = await this.followService.follow(
        authToken!,
        displayedUser!,
      );

      this.view.setIsFollower(true);
      this.view.setFollowerCount(followerCount);
      this.view.setFolloweeCount(followeeCount);
    }, "follow user");
    this.view.deleteMessage(followingUserToast);
    this.view.setIsLoading(false);
  }

  public async setIsFollowerStatus(
    authToken: AuthToken,
    currentUser: User,
    displayedUser: User,
  ) {
    this.doFailureReportingOperation(async () => {
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
    this.doFailureReportingOperation(async () => {
      this.view.setFolloweeCount(
        await this.followService.getFolloweeCount(authToken, displayedUser),
      );
    }, "get followees count");
  }

  public async setNumbFollowers(authToken: AuthToken, displayedUser: User) {
    this.doFailureReportingOperation(async () => {
      this.view.setFollowerCount(
        await this.followService.getFollowerCount(authToken, displayedUser),
      );
    }, "get followers count");
  }
}
