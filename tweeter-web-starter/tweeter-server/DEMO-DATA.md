# Demo data

The seed command creates two accounts with a unique run ID. The follower follows the author, and the author publishes twelve statuses so both the Story and Feed tabs have enough items to scroll. Both accounts use the same generated password, which the command prints once.

## Seed

Run from `tweeter-server` after deploying the stack and configuring AWS credentials with access to its users, auth tokens, follows, stories, feeds, and profile image bucket. Set the table and bucket environment variables to the physical resource names from that stack:

```powershell
$env:AWS_REGION = "us-east-2"
$env:USERS_TABLE_NAME = "your-users-table"
$env:AUTH_TOKENS_TABLE_NAME = "your-auth-tokens-table"
$env:FOLLOWS_TABLE_NAME = "your-follows-table"
$env:STORIES_TABLE_NAME = "your-stories-table"
$env:FEEDS_TABLE_NAME = "your-feeds-table"
$env:PROFILE_IMAGES_BUCKET_NAME = "your-profile-images-bucket"
npm run seed:demo -- --seed --confirm
```

The command prints the run ID, both aliases, the shared password, and a cleanup command. It saves a manifest under `.demo-seeds/<run-id>.json`. The manifest contains only the generated aliases, image keys, and status timestamps/content; it does not store passwords or authentication tokens.

## Cleanup

Use the printed run ID with the explicit confirmation flag:

```powershell
$runId = "paste-the-run-id"
npm run seed:demo -- --cleanup $runId --confirm
```

Cleanup validates the accounts, their follow counts, and their story/feed contents before deleting anything. It stops if either demo account has extra follow relationships or unseeded story/feed items, or if demo statuses remain in another user's feed (including a former follower's feed). Remove those passoff changes manually and retry. It deletes only the seed run's story and feed keys, the demo accounts and their profile images, the relationship between the demo accounts, and auth tokens belonging to their unique aliases. Cleanup scans the AuthTokens table and the Feeds table because neither has an index for those checks; these scans may consume read capacity.

The commands require `--seed` or `--cleanup <run-id>` plus `--confirm`; running the script without these arguments performs no AWS writes. They do not deploy or change the stack.
