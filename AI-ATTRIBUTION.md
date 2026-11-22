# AI attribution

## 2026-11-13: tweeter-web-starter/tweeter-shared/src/model/domain/User.ts, tweeter-web-starter/tweeter-shared/src/model/domain/Status.ts, tweeter-web-starter/tweeter-shared/src/model/domain/AuthToken.ts, tweeter-web-starter/tweeter-shared/src/index.ts, tweeter-web-starter/tweeter-shared/src/model/net/TweeterRequest.ts (new file), tweeter-web-starter/tweeter-shared/src/model/net/TweeterResponse.ts (new file), tweeter-web-starter/tweeter-shared/src/model/net/PagedItemRequest.ts (new file), tweeter-web-starter/tweeter-shared/src/model/net/PagedItemResponse.ts (new file), tweeter-web-starter/tweeter-server/package.json (new file), tweeter-web-starter/tweeter-server/tsconfig.json (new file), tweeter-web-starter/tweeter-server/src/index.ts (new file), tweeter-web-starter/tweeter-server/.gitignore (new file), tweeter-web-starter/package.json, tweeter-web-starter/package-lock.json, AI-ATTRIBUTION.md (new file)

- Tool: Cursor (Grok 4.7)
- Task: Add the shared request, response, and DTO contracts for Milestone 3, and create the tweeter-server module with a dependency on tweeter-shared. No feature logic yet.
- Review: Examined the created DTO objects and request and response classes. It all seems good to me

## 2026-11-13: tweeter-web-starter/tweeter-shared/src/model/net/RegisterRequest.ts (new file), tweeter-web-starter/tweeter-shared/src/model/net/AuthResponse.ts (new file), tweeter-web-starter/tweeter-shared/src/index.ts, tweeter-web-starter/tweeter-server/src/service/ClientError.ts (new file), tweeter-web-starter/tweeter-server/src/service/UserService.ts (new file), tweeter-web-starter/tweeter-server/src/lambda/ApiGateway.ts (new file), tweeter-web-starter/tweeter-server/src/lambda/RegisterLambda.ts (new file), tweeter-web-starter/tweeter-server/template.yaml (new file), tweeter-web-starter/tweeter-server/.gitignore, tweeter-web-starter/tweeter-server/package.json, tweeter-web-starter/package-lock.json, tweeter-web-starter/tweeter-web/src/model.network/ClientCommunicator.ts (new file), tweeter-web-starter/tweeter-web/src/model.network/ServerFacade.ts (new file), tweeter-web-starter/tweeter-web/src/model.service/UserService.ts, AI-ATTRIBUTION.md

- Tool: Cursor (Grok 4.7)
- Task: Implement the register feature end to end. Add the register request and auth response, a server UserService that returns FakeData, a register lambda, a SAM route for POST /auth/register, and a client ServerFacade that UserService.register calls.
- Review: ServerFacade and ApiGateway had errors which I told AI to fix. Other than the errors, the register lambda looks good and works well.

## 2026-11-13: tweeter-web-starter/tweeter-shared/src/model/net/LoginRequest.ts (new file), tweeter-web-starter/tweeter-shared/src/model/net/LogoutRequest.ts (new file), tweeter-web-starter/tweeter-shared/src/model/net/GetUserRequest.ts (new file), tweeter-web-starter/tweeter-shared/src/model/net/GetUserResponse.ts (new file), tweeter-web-starter/tweeter-shared/src/index.ts, tweeter-web-starter/tweeter-server/src/service/UserService.ts, tweeter-web-starter/tweeter-server/src/lambda/LoginLambda.ts (new file), tweeter-web-starter/tweeter-server/src/lambda/LogoutLambda.ts (new file), tweeter-web-starter/tweeter-server/src/lambda/GetUserLambda.ts (new file), tweeter-web-starter/tweeter-server/template.yaml, tweeter-web-starter/tweeter-server/package.json, tweeter-web-starter/tweeter-web/src/model.network/ServerFacade.ts, tweeter-web-starter/tweeter-web/src/model.service/UserService.ts, AI-ATTRIBUTION.md

- Tool: Cursor (Grok 4.7)
- Task: Connect login, logout, and get user to their own lambdas. Login returns the FakeData user and token. Logout and get user send the auth token in the JSON body. The server does not check the token value yet.
- Review: login, logout, and register lambda functions all look good and function correctly.

## 2026-11-13: tweeter-web-starter/tweeter-shared/src/model/net/PostStatusRequest.ts (new file), tweeter-web-starter/tweeter-shared/src/index.ts, tweeter-web-starter/tweeter-server/src/service/StatusService.ts (new file), tweeter-web-starter/tweeter-server/src/lambda/PostStatusLambda.ts (new file), tweeter-web-starter/tweeter-server/src/lambda/StoryLambda.ts (new file), tweeter-web-starter/tweeter-server/src/lambda/FeedLambda.ts (new file), tweeter-web-starter/tweeter-server/template.yaml, tweeter-web-starter/tweeter-server/package.json, tweeter-web-starter/tweeter-web/src/model.network/ServerFacade.ts, tweeter-web-starter/tweeter-web/src/model.service/StatusService.ts, AI-ATTRIBUTION.md

- Tool: Cursor (Grok 4.7)
- Task: Connect post status, story, and feed to their own lambdas. Story and feed use the shared paged request and return FakeData status pages. Post status accepts a status and does not store it.
- Review: No errors this time. FeedLambda and StoryLambda are very similar and probably don't need to be separate functions. We will deal with that later.

## 2026-11-14: tweeter-web-starter/tweeter-shared/src/model/net/FollowRequests.ts (new file), tweeter-web-starter/tweeter-shared/src/index.ts, tweeter-web-starter/tweeter-server/src/service/FollowService.ts (new file), tweeter-web-starter/tweeter-server/src/lambda/followHandlers.ts (new file), tweeter-web-starter/tweeter-server/src/lambda/FollowLambda.ts (new file), tweeter-web-starter/tweeter-server/src/lambda/UnfollowLambda.ts (new file), tweeter-web-starter/tweeter-server/src/lambda/IsFollowerLambda.ts (new file), tweeter-web-starter/tweeter-server/src/lambda/FollowerCountLambda.ts (new file), tweeter-web-starter/tweeter-server/src/lambda/FolloweeCountLambda.ts (new file), tweeter-web-starter/tweeter-server/src/lambda/FollowerListLambda.ts (new file), tweeter-web-starter/tweeter-server/src/lambda/FolloweeListLambda.ts (new file), tweeter-web-starter/tweeter-server/template.yaml, tweeter-web-starter/tweeter-server/package.json, tweeter-web-starter/tweeter-web/src/model.network/ServerFacade.ts, tweeter-web-starter/tweeter-web/src/model.service/FollowService.ts, AI-ATTRIBUTION.md

- Tool: Cursor (Grok 4.7)
- Task: Connect the seven follow features to their own lambdas. Follow and unfollow return both counts. The list routes reuse the paged request. Counts and is-follower still come from FakeData. Shared handler helpers keep the similar lambdas from copying the same code.
- Review: This all looks good to me and appears to work fine

## 2026-11-15: tweeter-web-starter/tweeter-web/test/model.network/ServerFacade.test.ts (new file), tweeter-web-starter/tweeter-web/test/model.service/StatusService.test.ts (new file), tweeter-web-starter/tweeter-web/package.json, tweeter-web-starter/package-lock.json, AI-ATTRIBUTION.md

- Tool: Cursor (Grok 4.7)
- Task: Add integration tests that call the deployed API. ServerFacade tests cover register, a follower page, and follower count. StatusService tests a successful story page against FakeData values.
- Review: I like how the tests follow the pattern of descirbe, beforeeach, it, and expect. However, they use no mocks or spies

## 2026-11-16: tweeter-api-swagger.yaml (new file), post-status-sequence.pdf (new file), AI-ATTRIBUTION.md

- Tool: Cursor (Grok 4.7)
- Task: Publish API documentation version 1.0 for the dev stage and export the Swagger file with API Gateway extensions. Each POST method has a description and documents status codes 200, 400, and 500. Draw the sequence diagram for a successful status post, from PostStatus.submitPost through API Gateway to listener.displayInfoMessage("Status posted!", 2000).
- Review: The sequence is clean and easy to follow. The yaml had most of what it needed except for integration responses.

## 2026-11-17: tweeter-api-swagger.yaml, AI-ATTRIBUTION.md

- Tool: Cursor (Grok 4.7)
- Task: Add integration responses for HTTP 200, 400, and 500 on each POST method, deploy them to the dev stage, and export the Swagger file again. The lambda stays a proxy integration. A normal login still returns 200, and an empty alias still returns 400.
- Review: Now everything is great and very well documented.

## 2026-11-20: tweeter-web-starter/tweeter-server/src/dao/PersistenceTypes.ts (new file), tweeter-web-starter/tweeter-server/src/dao/UserDao.ts (new file), tweeter-web-starter/tweeter-server/src/dao/AuthTokenDao.ts (new file), tweeter-web-starter/tweeter-server/src/dao/ImageDao.ts (new file), tweeter-web-starter/tweeter-server/src/dao/FollowDao.ts (new file), tweeter-web-starter/tweeter-server/src/dao/StoryDao.ts (new file), tweeter-web-starter/tweeter-server/src/dao/FeedDao.ts (new file), tweeter-web-starter/tweeter-server/src/dao/DaoFactory.ts (new file), tweeter-web-starter/tweeter-server/src/dao/index.ts (new file), tweeter-web-starter/tweeter-server/src/index.ts, AI-ATTRIBUTION.md

- Tool: Cursor (GPT-5.6 Sol)
- Task: Define database-agnostic DAO interfaces for users, sessions, profile images, follows, stories, and feeds. Add persistence records, a generic page type, and an abstract DAO factory so services can receive data access dependencies without knowing which database implements them.
- Review: The DAO interfaces are split cleanly with a useful DAOFactory. Looks good to me.

## 2026-11-20: tweeter-web-starter/tweeter-server/src/dao/dynamodb/PersistenceConfig.ts (new file), tweeter-web-starter/tweeter-server/src/dao/dynamodb/DynamoDbClient.ts (new file), tweeter-web-starter/tweeter-server/src/dao/dynamodb/DynamoDbItems.ts (new file), tweeter-web-starter/tweeter-server/src/dao/dynamodb/index.ts (new file), tweeter-web-starter/tweeter-server/package.json, tweeter-web-starter/tweeter-server/tsconfig.json, tweeter-web-starter/package-lock.json, AI-ATTRIBUTION.md

- Tool: Cursor (GPT-5.6 Sol)
- Task: Install the AWS SDK v3 DynamoDB and S3 clients plus bcryptjs and its requested type package. Add a reusable DynamoDB document client, deferred environment-based table configuration, concrete DynamoDB item types, record conversion helpers, DynamoDB TTL conversion, and a deterministic feed sort-key helper.
- Review: The interfaces describing DB structure look good, and so do the functions describing DB access.

## 2026-11-20: tweeter-web-starter/tweeter-server/template.yaml, AI-ATTRIBUTION.md

- Tool: Cursor (GPT-5.6 Sol)
- Task: Define provisioned DynamoDB tables for users, authentication tokens, follows, stories, and precomputed feeds; add the inverse follows index and token TTL; define the encrypted public profile-image S3 bucket; inject resource names into every Lambda; and grant each Lambda table- and bucket-scoped access for only its feature set.
- Review: Tables added to the yaml file in preparation for deployment to AWS. Looks good to me.

## 2026-11-20: tweeter-web-starter/tweeter-server/src/dao/dynamodb/DynamoDbUserDao.ts (new file), tweeter-web-starter/tweeter-server/src/dao/dynamodb/index.ts, AI-ATTRIBUTION.md

- Tool: Cursor (GPT-5.6 Sol)
- Task: Implement the DynamoDB user DAO with conditional alias creation, strongly consistent single-user reads, ordered batch reads, duplicate-key handling, 100-key chunking, and exponential retries for unprocessed batch keys.
- Review: The UserDAO looks and works great. Get and create users.

## 2026-11-21: tweeter-web-starter/tweeter-server/src/dao/InvalidImageError.ts (new file), tweeter-web-starter/tweeter-server/src/dao/index.ts, tweeter-web-starter/tweeter-server/src/dao/s3/S3Client.ts (new file), tweeter-web-starter/tweeter-server/src/dao/s3/S3ImageDao.ts (new file), tweeter-web-starter/tweeter-server/src/dao/s3/index.ts (new file), tweeter-web-starter/tweeter-server/src/index.ts, AI-ATTRIBUTION.md

- Tool: Cursor (GPT-5.6 Sol)
- Task: Implement the S3 profile-image DAO with reusable client configuration, strict base64 validation, supported extension and file-signature checks, safe object keys, correct image content types, public URLs, and deletion for registration cleanup.
- Review: The image interaction for s3 looks good to me. This code handles s3 security.

## 2026-11-21: tweeter-web-starter/tweeter-server/src/dao/AuthTokenDao.ts, tweeter-web-starter/tweeter-server/src/dao/dynamodb/DynamoDbAuthTokenDao.ts (new file), tweeter-web-starter/tweeter-server/src/dao/dynamodb/index.ts, tweeter-web-starter/tweeter-server/src/service/AuthorizationService.ts (new file), tweeter-web-starter/tweeter-server/src/service/PasswordHasher.ts (new file), tweeter-web-starter/tweeter-server/src/service/UnauthorizedError.ts (new file), tweeter-web-starter/tweeter-server/src/lambda/ApiGateway.ts, tweeter-web-starter/tweeter-server/src/index.ts, AI-ATTRIBUTION.md

- Tool: Cursor (GPT-5.6 Sol)
- Task: Implement conditional authentication-token persistence, exact expiration checks, DynamoDB TTL cleanup values, ten-minute sliding inactivity windows, session creation and logout, bcrypt password hashing and comparison, and CORS-bearing HTTP 401 responses for unauthorized requests.
- Review: Sessions implemented. Uses Bcrypt for passwords and sessions last 10 minutes. Overall, security looks good.

## 2026-11-21: tweeter-web-starter/tweeter-server/src/dao/UserDao.ts, tweeter-web-starter/tweeter-server/src/dao/dynamodb/DynamoDbUserDao.ts, tweeter-web-starter/tweeter-server/src/service/UserService.ts, tweeter-web-starter/tweeter-server/src/lambda/RegisterLambda.ts, AI-ATTRIBUTION.md

- Tool: Cursor (GPT-5.6 Sol)
- Task: Replace dummy registration with injected DynamoDB, S3, bcrypt, and authorization dependencies. Normalize and validate aliases, reject duplicates, hash passwords, upload unique profile images, initialize counts, persist users, create sessions, and roll back the user and image if a later registration step fails.
- Review: Registration works now with password hashing, creating an authtoken, and even uploading images

## 2026-11-21: tweeter-web-starter/tweeter-server/src/service/UserService.ts, tweeter-web-starter/tweeter-server/src/lambda/LoginLambda.ts, tweeter-web-starter/tweeter-server/src/lambda/LogoutLambda.ts, AI-ATTRIBUTION.md

- Tool: Cursor (GPT-5.6 Sol)
- Task: Replace dummy login and logout with injected persistence. Normalize login aliases, load the stored user, compare bcrypt hashes, return the same unauthorized response for an unknown alias or wrong password, create a fresh session on login, and authenticate then delete the exact session on logout.
- Review: Now the login and logout work like the registration. It uses bcrypt, receieves and authtoken, starts and ends a session

## 2026-11-21: tweeter-web-starter/tweeter-server/src/dao/DaoFactory.ts, tweeter-web-starter/tweeter-server/src/dao/index.ts, tweeter-web-starter/tweeter-server/src/dao/aws/AwsDaoFactory.ts (new file), tweeter-web-starter/tweeter-server/src/dao/aws/index.ts (new file), tweeter-web-starter/tweeter-server/src/index.ts, tweeter-web-starter/tweeter-server/src/lambda/ServiceProvider.ts (new file), tweeter-web-starter/tweeter-server/src/lambda/RegisterLambda.ts, tweeter-web-starter/tweeter-server/src/lambda/LoginLambda.ts, tweeter-web-starter/tweeter-server/src/lambda/LogoutLambda.ts, tweeter-web-starter/tweeter-server/src/lambda/GetUserLambda.ts, tweeter-web-starter/tweeter-server/src/service/UserService.ts, AI-ATTRIBUTION.md

- Tool: Cursor (GPT-5.6 Sol)
- Task: Add an AWS implementation of the user DAO factory and a shared Lambda composition root. Refactor UserService to receive its abstract factory and shared authorization/password dependencies, remove repeated Lambda wiring, replace get-user FakeData with authenticated DynamoDB lookup, normalize aliases, and refresh token activity.
- Review: Lots of duplication removal which is great. looks good overall

## 2026-11-21: tweeter-web-starter/tweeter-server/src/dao/DaoFactory.ts, tweeter-web-starter/tweeter-server/src/dao/aws/AwsDaoFactory.ts, tweeter-web-starter/tweeter-server/src/dao/dynamodb/DynamoDbFollowDao.ts (new file), tweeter-web-starter/tweeter-server/src/dao/dynamodb/index.ts, tweeter-web-starter/tweeter-server/src/dao/index.ts, tweeter-web-starter/tweeter-server/src/index.ts, AI-ATTRIBUTION.md

- Tool: Cursor (GPT-5.6 Sol)
- Task: Implement the DynamoDB follow DAO with atomic conditional transactions that create or delete relationships while updating both users' counters, strongly consistent relationship checks, alphabetical follower/followee pagination through the inverse index and primary key, accurate lookahead-based pagination flags, complete follower retrieval for feed fan-out, and abstract-factory wiring.
- Review: The followDAO now allows for CRUD of the follow table on AWS. get followers, create follow, delete follow. all look good
