# WorkLog Backend Cognito Authentication

This document describes the initial Cognito JWT bearer authentication integration in `SC.WorkLog.WebApp`.

## Token Flow

1. The React frontend authenticates with Cognito through Amplify.
2. The frontend sends API requests with:

```text
Authorization: Bearer <id-token>
```

3. `SC.WorkLog.WebApp` validates the token with ASP.NET Core JWT Bearer authentication.
4. During token validation, the backend resolves the WorkLog application user by email.
5. Server-side claims are added for WorkLog user id, user type, role and linked employee/customer ids.

Frontend role switching is demo-only and is never trusted by the backend.

## Cognito Settings

Configuration is provided through `CognitoSettings`:

- `Region`
- `UserPoolId`
- `ClientId`
- `Authority`
- `ValidIssuer`
- `ValidAudience`

`Authority` can be set explicitly, or derived from:

```text
https://cognito-idp.{region}.amazonaws.com/{userPoolId}
```

Development appsettings may contain non-secret Cognito identifiers such as region, user pool id and app client id. Secrets and production values must come from environment-specific configuration or secret management.

## Token Validation

`Program.cs` configures:

- `AddAuthentication`
- `AddJwtBearer`
- issuer validation;
- signing key validation;
- lifetime validation;
- `token_use = id` validation;
- bearer token reading from the standard `Authorization` header.

The frontend sends Cognito ID tokens to the backend so profile claims such as `email` are available during current-user resolution. Audience validation is not enabled as a generic `aud` check. Instead, when `ClientId` is configured, the backend validates either:

- `client_id` claim for legacy access-token style tokens;
- `aud` claim for id-token style tokens.

## WorkLog User Lookup

The backend maps Cognito users to `WorkLogUser` using:

```text
email claim -> WorkLogUser.Email
```

If no active WorkLog user exists, validation fails. Users are not created automatically. The detailed reason is logged server-side and the client receives a generic authentication failure.

## Role Resolution

`WorkLogUser` owns the authoritative application role:

- `Employee`
- `Admin`
- `Customer`

During token validation, the backend adds server-side claims:

- `worklog:user_id`
- `worklog:user_type`
- `worklog:employee_id`
- `worklog:customer_id`
- `worklog:role`

The WebApp `CurrentUser` implementation exposes these through `ICurrentUser`.

`Employee.Role` is no longer used; Employee is only the operational/HR profile.

## Customer Users

Customer users authenticate through Cognito email/password, but WorkLog customer portal access is not enabled yet.

If a valid Cognito token resolves to a `WorkLogUser` with `UserType = Customer`, authentication is rejected. The backend logs the detailed reason server-side and returns a generic authentication failure to the client. No customer project/ticket visibility is implemented in this phase.

## Current User

`ICurrentUser` exposes the server-side current user abstraction:

- `Subject`
- `Email`
- `Name`
- `WorkLogUserId`
- `UserType`
- `EmployeeId`
- `CustomerId`
- `Role`
- `IsAuthenticated`
- `IsAdmin`
- `IsEmployee`
- `IsCustomer`

Future controllers can pass these values to application services or build `WorkLogUserContext` without relying on frontend state.

## Endpoint

A minimal authenticated endpoint is available:

```text
GET /api/Auth/Me
```

It returns `CurrentUserResponse` from the Application DTO layer. The role/profile source remains the backend `WorkLogUser` resolved during token validation.

## Pending

- Customer portal authorization and UI.
- Project/customer visibility rules.
- More granular policies beyond the initial `AdminOnly` placeholder.
- Real Cognito values and deployment secret management.
