// AI-assisted: see AI-ATTRIBUTION.md

export { Follow } from "./model/domain/Follow";
export { PostSegment, Type } from "./model/domain/PostSegment";
export { Status } from "./model/domain/Status";
export type { StatusDto } from "./model/domain/Status";
export { User } from "./model/domain/User";
export type { UserDto } from "./model/domain/User";
export { AuthToken } from "./model/domain/AuthToken";
export type { AuthTokenDto } from "./model/domain/AuthToken";
export type { TweeterRequest } from "./model/net/TweeterRequest";
export type { TweeterResponse } from "./model/net/TweeterResponse";
export type { PagedItemRequest } from "./model/net/PagedItemRequest";
export type { PagedItemResponse } from "./model/net/PagedItemResponse";
export type { RegisterRequest } from "./model/net/RegisterRequest";
export type { AuthResponse } from "./model/net/AuthResponse";
export type { LoginRequest } from "./model/net/LoginRequest";
export type { LogoutRequest } from "./model/net/LogoutRequest";
export type { GetUserRequest } from "./model/net/GetUserRequest";
export type { GetUserResponse } from "./model/net/GetUserResponse";
export type { PostStatusRequest } from "./model/net/PostStatusRequest";

// All classes that should be avaialble to other modules need to exported here. export * does not work when
// uploading to lambda. Instead we have to list each export.
export { FakeData } from "./util/FakeData";
