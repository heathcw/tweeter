import { UserNavigationPresenter } from "../../presenter/UserNavigationPresenter";
import { useUserInfo, useUserInfoActions } from "../userInfo/UserHooks";
import { useMessageActions } from "../toaster/MessageHooks";
import { useNavigate } from "react-router-dom";

export const useUserNavigation = () => {
  const { displayErrorMessage } = useMessageActions();
  const { displayedUser, authToken } = useUserInfo();
  const { setDisplayedUser } = useUserInfoActions();

  const navigate = useNavigate();

  const presenter: UserNavigationPresenter = new UserNavigationPresenter();

  return {
    navigateToUser: async (
      event: React.MouseEvent,
      featureURL: string,
    ): Promise<void> => {
      event.preventDefault();

      try {
        const alias = presenter.extractAlias(event.target.toString());

        const toUser = await presenter.getUser(authToken!, alias);

        if (toUser) {
          if (!toUser.equals(displayedUser!)) {
            setDisplayedUser(toUser);
            navigate(`${featureURL}/${toUser.alias}`);
          }
        }
      } catch (error) {
        displayErrorMessage(
          `Failed to get user because of exception: ${error}`,
        );
      }
    },
  };
};
