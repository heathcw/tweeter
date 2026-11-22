// AI-assisted: see AI-ATTRIBUTION.md

import { AwsDaoFactory } from "../dao/aws";
import { AuthorizationService } from "../service/AuthorizationService";
import { PasswordHasher } from "../service/PasswordHasher";
import { UserService } from "../service/UserService";

/**
 * Lambda composition root. Concrete AWS dependencies are created here and
 * injected into database-agnostic services.
 */
export const daoFactory = new AwsDaoFactory();
export const authorizationService = new AuthorizationService(
  daoFactory.createAuthTokenDao(),
);
export const userService = new UserService(
  daoFactory,
  authorizationService,
  new PasswordHasher(),
);
