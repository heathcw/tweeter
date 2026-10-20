import "./App.css";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import Login from "./components/authentication/login/Login";
import Register from "./components/authentication/register/Register";
import MainLayout from "./components/mainLayout/MainLayout";
import Toaster from "./components/toaster/Toaster";
import { useUserInfo } from "./components/userInfo/UserHooks";
import { FollowerPresenter } from "./presenter/FollowerPresenter";
import { FeedPresenter } from "./presenter/FeedPresenter";
import { Status, User } from "tweeter-shared";
import { PageItemView } from "./presenter/PageItemPresenter";
import ItemScroller from "./components/mainLayout/ItemScroller";
import StatusItem from "./components/statusItem/StatusItem";
import UserItem from "./components/userItem/UserItem";
import { StoryPresenter } from "./presenter/StoryPresenter";
import { FolloweePresenter } from "./presenter/FolloweePresenter";

const App = () => {
  const { currentUser, authToken } = useUserInfo();

  const isAuthenticated = (): boolean => {
    return !!currentUser && !!authToken;
  };

  return (
    <div>
      <Toaster position="top-right" />
      <BrowserRouter>
        {isAuthenticated() ? (
          <AuthenticatedRoutes />
        ) : (
          <UnauthenticatedRoutes />
        )}
      </BrowserRouter>
    </div>
  );
};

const AuthenticatedRoutes = () => {
  const { displayedUser } = useUserInfo();

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route
          index
          element={<Navigate to={`/feed/${displayedUser!.alias}`} />}
        />
        <Route
          path="feed/:displayedUser"
          element={
            BuildStatusItemScroller("/feed", displayedUser!, (view: PageItemView<Status>) => new FeedPresenter(view))
          }
        />
        <Route
          path="story/:displayedUser"
          element={
            BuildStatusItemScroller("/story", displayedUser!, (view: PageItemView<Status>) => new StoryPresenter(view))
          }
        />
        <Route
          path="followees/:displayedUser"
          element={
            BuildUserItemScroller("/followees", displayedUser!, (view: PageItemView<User>) => new FolloweePresenter(view))
          }
        />
        <Route
          path="followers/:displayedUser"
          element={
            BuildUserItemScroller("/followers", displayedUser!, (view: PageItemView<User>) => new FollowerPresenter(view))
          }
        />
        <Route path="logout" element={<Navigate to="/login" />} />
        <Route
          path="*"
          element={<Navigate to={`/feed/${displayedUser!.alias}`} />}
        />
      </Route>
    </Routes>
  );
};

const UnauthenticatedRoutes = () => {
  const location = useLocation();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="*" element={<Login originalUrl={location.pathname} />} />
    </Routes>
  );
};

const BuildStatusItemScroller = (featurePath: string, displayedUser: User, presenterFactory: (view: PageItemView<Status>) => any) => {
  return (
    <ItemScroller
      key={`feed-${displayedUser!.alias}`}
      featurePath={featurePath}
      presenterFactory={presenterFactory}
      itemComponentFactory={(item: Status, featurePath: string) => (
        <StatusItem status={item} user={item.user} featurePath={featurePath} />
      )}
    />
  );
};

const BuildUserItemScroller = (featurePath: string, displayedUser: User, presenterFactory: (view: PageItemView<User>) => any) => {
 return (
  <ItemScroller
              key={`followers-${displayedUser!.alias}`}
              featurePath={featurePath}
              presenterFactory={presenterFactory}
              itemComponentFactory={(item: User, featurePath: string) => (
                <UserItem user={item} featurePath={featurePath} />
              )}
            />
 )
}

export default App;
