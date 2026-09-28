import { AuthToken, User, FakeData } from "tweeter-shared";
import { useUserInfo, useUserInfoActions } from "../userInfo/UserHooks";
import { useMessageActions } from "../toaster/MessageHooks";
import { useNavigate } from "react-router/dist/lib/hooks";

export const useUserNavigation = () => {
    const { displayErrorMessage } = useMessageActions();
    const { displayedUser, authToken } = useUserInfo();
    const { setDisplayedUser } = useUserInfoActions();

    const navigate = useNavigate();

    const extractAlias = (value: string): string => {
        const index = value.indexOf("@");
        return value.substring(index);
    };
    
    const getUser = async (
        authToken: AuthToken,
        alias: string
    ): Promise<User | null> => {
        // TODO: Replace with the result of calling server
        return FakeData.instance.findUserByAlias(alias);
    };

    return {
        navigateToUser: async (event: React.MouseEvent, featureURL: string): Promise<void> => {
            event.preventDefault();

            try {
            const alias = extractAlias(event.target.toString());

            const toUser = await getUser(authToken!, alias);

            if (toUser) {
                if (!toUser.equals(displayedUser!)) {
                setDisplayedUser(toUser);
                navigate(`${featureURL}/${toUser.alias}`);
                }
            }
            } catch (error) {
            displayErrorMessage(
                `Failed to get user because of exception: ${error}`
            );
            }
        }
    }
}