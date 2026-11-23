# Tweeter API

The API exposes fourteen JSON `POST` routes. Send `Content-Type: application/json` and a JSON object in each request body. Successful responses use HTTP `200` and include `success: true` and `message: null`; route-specific fields are listed below.

## Routes

| Route | Request body | Successful response fields | Authentication |
| --- | --- | --- | --- |
| `/auth/register` | `firstName`, `lastName`, `alias`, `password`, base64 `userImage`, `imageFileExtension` | `user`, `token` | No existing token |
| `/auth/login` | `alias`, `password` | `user`, `token` | No existing token |
| `/auth/logout` | `token` | none | Required; invalidates this token |
| `/user/get` | `token`, `alias` | `user` (null when absent) | Required |
| `/status/post` | `token`, `status` (StatusDto) | none | Required |
| `/status/story` | `token`, `userAlias`, `pageSize`, `lastItem` (StatusDto or null) | `items`, `hasMore` | Required |
| `/status/feed` | `token`, `userAlias`, `pageSize`, `lastItem` (StatusDto or null) | `items`, `hasMore` | Required; own feed only |
| `/follow` | `token`, `user` (UserDto) | `followerCount`, `followeeCount` | Required |
| `/unfollow` | `token`, `user` (UserDto) | `followerCount`, `followeeCount` | Required |
| `/follow/isFollower` | `token`, `user` and `selectedUser` (UserDto) | `isFollower` | Required |
| `/follower/count` | `token`, `user` (UserDto) | `count` | Required |
| `/followee/count` | `token`, `user` (UserDto) | `count` | Required |
| `/follower/list` | `token`, `userAlias`, `pageSize`, `lastItem` (UserDto or null) | `items`, `hasMore` | Required |
| `/followee/list` | `token`, `userAlias`, `pageSize`, `lastItem` (UserDto or null) | `items`, `hasMore` | Required |

Authenticated operations extend the token's inactivity window to ten minutes. Logout validates and immediately invalidates the supplied token. `lastItem` is null on the first page and is the final DTO returned by the previous page thereafter.

## Errors and CORS

Errors are returned as JSON `{ "errorMessage": "..." }` with the matching HTTP status:

- `400 Bad Request`: malformed JSON, a non-object body, or invalid request data.
- `401 Unauthorized`: missing, invalid, or expired token; login credentials that do not match.
- `500 Internal Server Error`: unexpected server or persistence failure. The response uses a generic message and does not expose internal exception details.

All Lambda proxy responses, including errors, include `Access-Control-Allow-Origin: *`, allow the `Content-Type` header, and declare `POST,OPTIONS` as allowed methods. API Gateway also handles CORS preflight for the configured API.
