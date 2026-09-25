import { AuthToken, FakeData, Status, User } from "tweeter-shared";
import Post from "./Post";
import { Link, useNavigate } from "react-router-dom";
import { ToastType } from "../toaster/Toast";
import { useContext } from "react";
import { UserInfoActionsContext, UserInfoContext } from "../userInfo/UserInfoContexts";
import { ToastActionsContext } from "../toaster/ToastContexts";

interface Props {
  status: Status;
  user: User;
  featuredPath: string;
}

const StatusItem = (props: Props) => {
    const { displayToast } = useContext(ToastActionsContext);
    const { displayedUser, authToken } = useContext(UserInfoContext);
    const { setDisplayedUser } = useContext(UserInfoActionsContext);

    const navigate = useNavigate();

    const navigateToUser = async (event: React.MouseEvent): Promise<void> => {
        event.preventDefault();
    
        try {
          const alias = extractAlias(event.target.toString());
    
          const toUser = await getUser(authToken!, alias);
    
          if (toUser) {
            if (!toUser.equals(displayedUser!)) {
              setDisplayedUser(toUser);
              navigate(`/${props.featuredPath}/${toUser.alias}`);
            }
          }
        } catch (error) {
          displayToast(
            ToastType.Error,
            `Failed to get user because of exception: ${error}`,
            0
          );
        }
      };

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
      
    return (
        <div className="col bg-light mx-0 px-0">
              <div className="container px-0">
                <div className="row mx-0 px-0">
                  <div className="col-auto p-3">
                    <img
                      src={props.user.imageUrl}
                      className="img-fluid"
                      width="80"
                      alt="Posting user"
                    />
                  </div>
                  <div className="col">
                    <h2>
                      <b>
                        {props.user.firstName} {props.user.lastName}
                      </b>{" "}
                      -{" "}
                      <Link
                        to={`/${props.featuredPath}/${props.user.alias}`}
                        onClick={navigateToUser}
                      >
                        {props.user.alias}
                      </Link>
                    </h2>
                    {props.status.formattedDate}
                    <br />
                    <Post status={props.status} featurePath={props.featuredPath} />
                  </div>
                </div>
              </div>
            </div>
    );
}

export default StatusItem;