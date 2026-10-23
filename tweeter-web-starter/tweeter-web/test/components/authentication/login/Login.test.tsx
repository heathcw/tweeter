import Login from "../../../../src/components/authentication/login/Login";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fab } from "@fortawesome/free-brands-svg-icons";
import { instance, mock, verify } from "@typestrong/ts-mockito";
import { LoginPresenter } from "../../../../src/presenter/LoginPresenter";

library.add(fab);

describe("Login Component", () => {
  it("starts with the sign in button disabled", () => {
    const { signInButton } = renderLoginAndGetElements("/");
    expect(signInButton).toBeDisabled();
  });

  it("enables the sign in button if both alias and password fields have text", async () => {
    const { user, signInButton, aliasField, passwordField } =
      renderLoginAndGetElements("/");

    await typeInFieldAndExpectButtonState(
      user,
      aliasField,
      passwordField,
      signInButton,
    );
  });

  it("disables the sign in button if either the alias or password field is cleared", async () => {
    const { user, signInButton, aliasField, passwordField } =
      renderLoginAndGetElements("/");

    await typeInFieldAndExpectButtonState(
      user,
      aliasField,
      passwordField,
      signInButton,
    );

    await clearFieldAndExpectButtonState(user, aliasField, signInButton);

    await user.type(aliasField, "testuser");
    expect(signInButton).toBeEnabled();

    await clearFieldAndExpectButtonState(user, passwordField, signInButton);
  });

  it("calls the correct function with the right parameters when the sign-in button is pressed", async () => {
    const mockPresenter = mock<LoginPresenter>();
    const mockPresenterInstance = instance(mockPresenter);

    const originalUrl = "/"
    const alias = "testuser";
    const password = "password";

    const { user, signInButton, aliasField, passwordField } =
      renderLoginAndGetElements(originalUrl, mockPresenterInstance);

    await typeInFieldAndExpectButtonState(
      user,
      aliasField,
      passwordField,
      signInButton,
    );

    await user.click(signInButton);
    verify(mockPresenter.doLogin(originalUrl, alias, password, false)).once();
  });
});

function renderLogin(originalUrl: string, presenter?: LoginPresenter) {
  return render(
    <MemoryRouter>
      (!!presenter ? (<Login originalUrl={originalUrl} presenter={presenter} />)
      : <Login originalUrl={originalUrl} />)
    </MemoryRouter>,
  );
}

function renderLoginAndGetElements(originalUrl: string, presenter?: LoginPresenter) {
  const user = userEvent.setup();

  renderLogin(originalUrl, presenter);

  const signInButton = screen.getAllByRole("button", { name: /Sign in/i })[0];
  const aliasField = screen.getAllByLabelText("alias")[0];
  const passwordField = screen.getAllByLabelText("password")[0];

  return { user, signInButton, aliasField, passwordField };
}

async function typeInFieldAndExpectButtonState(
  user: ReturnType<typeof userEvent.setup>,
  aliasField: HTMLElement,
  passwordField: HTMLElement,
  signInButton: HTMLElement,
) {
  await user.type(aliasField, "testuser");
  await user.type(passwordField, "password");

  expect(signInButton).toBeEnabled();
}

async function clearFieldAndExpectButtonState(
  user: ReturnType<typeof userEvent.setup>,
  field: HTMLElement,
  signInButton: HTMLElement,
) {
  await user.clear(field);
  expect(signInButton).toBeDisabled();
}
