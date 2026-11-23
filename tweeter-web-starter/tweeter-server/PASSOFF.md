# Persistent Tweeter passoff

The server now reads and writes users, sessions, follows, stories, and feeds through the DAO interfaces backed by DynamoDB. Profile images are stored in S3. The server source and tests no longer import `FakeData`; the old web tests that exercised FakeData-backed server behavior have been removed.

## Local checks

From `tweeter-server`, run:

```powershell
npm test
npm run build
npm run bundle
```

The deployed API contract is documented in [API.md](./API.md). Demo seed and safe cleanup instructions are in [DEMO-DATA.md](./DEMO-DATA.md).

## Deployed API integration verification

The persistent API suite creates unique temporary users, profile images, a follow relationship, and statuses. It checks registration and duplicate rejection, login success and failure, session refresh, follow constraints and counters, story/feed paging, feed preservation after unfollow, CORS behavior, and logout invalidation. The suite then validates that the temporary accounts contain no unrelated data before removing its records. It scans the feeds table during cleanup, which can consume read capacity.

Deploy the server stack using the project's SAM workflow first. Deployment changes AWS resources and must be performed deliberately. Then, from `tweeter-server`, set the values from the stack outputs and run:

```powershell
$env:RUN_PERSISTENT_API_TESTS = "YES"
$env:TWEETER_API_URL = "<ApiUrl output>"
$env:AWS_REGION = "us-east-2"
$env:USERS_TABLE_NAME = "<UsersTableName output>"
$env:AUTH_TOKENS_TABLE_NAME = "<AuthTokensTableName output>"
$env:FOLLOWS_TABLE_NAME = "<FollowsTableName output>"
$env:STORIES_TABLE_NAME = "<StoriesTableName output>"
$env:FEEDS_TABLE_NAME = "<FeedsTableName output>"
$env:PROFILE_IMAGES_BUCKET_NAME = "<ProfileImagesBucketName output>"
npm run test:integration
```

The AWS identity used for the test needs access to the API and the named tables and bucket. Without `RUN_PERSISTENT_API_TESTS=YES`, the integration suite is skipped and makes no API or AWS requests. Do not run multiple copies of this suite at once. If an assertion fails, inspect the unique `@e2e...` accounts and remove only that run's records after confirming they have no unrelated data.

## Client configuration

The web client sends requests to the base URL configured in `tweeter-web/src/model.network/ServerFacade.ts`. After deployment, set it to the stack's `ApiUrl` output (without a trailing slash) and redeploy the client if required by the course environment. The integration suite calls the API directly and does not start the web UI.
