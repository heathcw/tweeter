import { MemoryRouter } from "react-router-dom";
import PostStatus from "../../../src/components/postStatus/PostStatus";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useUserInfo } from "../../../src/components/userInfo/UserHooks";
import { instance, mock, verify, anything } from "@typestrong/ts-mockito";
import { AuthToken, User } from "tweeter-shared";
import { userEvent } from "@testing-library/user-event";
import { PostStatusPresenter } from "../../../src/presenter/PostStatusPresenter";

jest.mock("../../../src/components/userInfo/UserHooks", () => ({
  ...jest.requireActual("../../../src/components/userInfo/UserHooks"),
  __esModule: true,
  useUserInfo: jest.fn(),
}));

describe("PostStatus Component", () => {
  let mockUser: User;
  let mockAuthToken: AuthToken;

  beforeAll(() => {
    mockUser = mock<User>();
    mockAuthToken = mock<AuthToken>();
    (useUserInfo as jest.Mock).mockReturnValue({
      currentUser: instance(mockUser),
      authToken: instance(mockAuthToken),
    });
  });

  it("starts with the post status and clear button disabled", () => {
    const { postStatusButton, clearButton } = renderPostStatusAndGetElements();
    expectButtonsToBeDisabled(postStatusButton, clearButton);
  });

  it("enables the post status and clear button if the status field has text", async () => {
    const { user, postStatusButton, clearButton, postStatusTextArea } =
      renderPostStatusAndGetElements();

    await typeInFieldAndExpectButtonState(
      user,
      postStatusTextArea,
      postStatusButton,
      clearButton,
    );
  });

  it("disables the post status and clear button if the status field is cleared", async () => {
    const { user, postStatusButton, clearButton, postStatusTextArea } =
      renderPostStatusAndGetElements();

    await typeInFieldAndExpectButtonState(
      user,
      postStatusTextArea,
      postStatusButton,
      clearButton,
    );

    await user.clear(postStatusTextArea);
    expectButtonsToBeDisabled(postStatusButton, clearButton);
  });

  it("calls the correct function with the right parameters when the post status button is pressed", async () => {
    const mockPresenter = mock<PostStatusPresenter>();
    const mockPresenterInstance = instance(mockPresenter);

    const post = "Hello, world!";

    const { user, postStatusButton, postStatusTextArea, clearButton } =
      renderPostStatusAndGetElements(mockPresenterInstance);

    await typeInFieldAndExpectButtonState(
      user,
      postStatusTextArea,
      postStatusButton,
      clearButton,
    );

    await user.click(postStatusButton);
    verify(mockPresenter.submitPost(anything(), post, instance(mockUser), instance(mockAuthToken))).once();
  })
});

function renderPostStatus(presenter?: PostStatusPresenter) {
  return render(
    <MemoryRouter>
      (!!presenter ? (<PostStatus presenter={presenter} />)
      : <PostStatus />)
    </MemoryRouter>,
  );
}

function renderPostStatusAndGetElements(presenter?: PostStatusPresenter) {
  const user = userEvent.setup();
  renderPostStatus(presenter);

  const postStatusButton = screen.getAllByRole("button", {
    name: /post status/i,
  })[0];
  const clearButton = screen.getAllByRole("button", { name: /clear/i })[0];
  const postStatusTextArea = screen.getAllByPlaceholderText(/What's on your mind\?/i)[0];

  return {
    user,
    postStatusButton,
    clearButton,
    postStatusTextArea,
  };
}

async function typeInFieldAndExpectButtonState(
  user: ReturnType<typeof userEvent.setup>,
  postStatusTextArea: HTMLElement,
  postStatusButton: HTMLElement,
  clearButton: HTMLElement,
) {
  await user.type(postStatusTextArea, "Hello, world!");
  expect(postStatusButton).toBeEnabled();
  expect(clearButton).toBeEnabled();
}

function expectButtonsToBeDisabled(
  postStatusButton: HTMLElement,
  clearButton: HTMLElement,
) {
  expect(postStatusButton).toBeDisabled();
  expect(clearButton).toBeDisabled();
}
