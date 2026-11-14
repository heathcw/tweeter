// AI-assisted: see AI-ATTRIBUTION.md

import {
  AuthResponse,
  AuthToken,
  RegisterRequest,
  User,
} from "tweeter-shared";
import { ClientCommunicator } from "./ClientCommunicator";

export class ServerFacade {
  // ApiUrl from the tweeter stack. No trailing slash.
  private readonly serverUrl =
    "https://iodbhsw2hl.execute-api.us-east-2.amazonaws.com/dev";

  private clientCommunicator = new ClientCommunicator(this.serverUrl);

  public async register(
    request: RegisterRequest,
  ): Promise<[User, AuthToken]> {
    const response = await this.clientCommunicator.doPost<
      RegisterRequest,
      AuthResponse
    >(request, "/auth/register");

    if (response.success) {
      const user = User.fromDto(response.user);
      const token = AuthToken.fromDto(response.token);
      if (user === null || token === null) {
        throw new Error("Invalid registration");
      }
      return [user, token];
    } else {
      console.error(response);
      throw new Error(response.message ?? "Invalid registration");
    }
  }
}
