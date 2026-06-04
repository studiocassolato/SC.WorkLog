# WorkLog Frontend Cognito Authentication

This document describes the Cognito authentication shell in `SC.WorkLog.WebApp/client-app`.

## Flow

The React application is prepared to authenticate with AWS Cognito through AWS Amplify:

1. The user opens the WorkLog frontend.
2. `AuthProvider` checks the current Cognito session.
3. If no authenticated session exists, `ProtectedRoute` shows the WorkLog login screen.
4. After sign-in, the frontend retrieves a Cognito ID token.
5. `AuthProvider` calls the backend current-user endpoint:

```text
GET /api/Auth/Me
```

6. `SC.WorkLog.WebApp` validates the bearer token and resolves the authoritative `WorkLogUser`.
7. `/api/Auth/Me` returns `CurrentUserResponse`.
8. The frontend stores the backend current-user response and uses it as the UI role/profile source.
9. The frontend `WorkLogCurrentUser` type matches the backend DTO response shape.
10. Axios requests made through `apiClient` attach the ID token:

```text
Authorization: Bearer <id-token>
```

Backend JWT validation is configured in `SC.WorkLog.WebApp`; see `docs/worklog/backend-auth-cognito.md`.

## Environment Variables

Configuration is read from Vite environment variables:

- `VITE_API_BASE_URL`: API base URL used by the Axios client. Development currently defaults to `/api`.
- `VITE_BACKEND_URL`: Vite dev proxy target for ASP.NET Core.
- `VITE_COGNITO_REGION`: Cognito region.
- `VITE_COGNITO_USER_POOL_ID`: Cognito user pool id.
- `VITE_COGNITO_CLIENT_ID`: Cognito app client id.
- `VITE_COGNITO_DOMAIN`: optional hosted UI domain for federated sign-in.
- `VITE_COGNITO_EMPLOYEE_PROVIDER`: optional Cognito identity provider name for direct employee federation. Leave empty to open the generic Hosted UI.
- `VITE_ENABLE_DEMO_ROLE_SWITCHER`: enables the Admin/Employee demo role switcher when `true`.

Only placeholders are stored in the repository. Real values should be supplied per environment.

## Implemented

- `AuthProvider` and `useAuth` expose Cognito authentication state, backend WorkLog current-user state, sign-in/sign-out, token retrieval and current-user reload.
- After Cognito login, the frontend calls `/api/Auth/Me` and stores the `CurrentUserResponse`.
- UI role/profile display and navigation visibility use the backend current user, not the demo role switcher.
- Login UI supports:
  - `Employees login` through Hosted UI, optionally targeting the provider named by `VITE_COGNITO_EMPLOYEE_PROVIDER`;
  - `Customer login` through email and password. The UI is prepared, but the customer portal is not enabled yet.
- `ProtectedRoute` requires both a valid Cognito session and successful backend current-user resolution.
- If backend current-user resolution fails, the app shell is not rendered and the user can retry or logout.
- `apiClient` centralizes Axios configuration and bearer token attachment.
- The top bar shows backend current-user email, display name, role and user type when available.
- Settings Employees and Customers use backend APIs and manage related `WorkLogUser` access records behind the scenes. There is no separate WorkLog Users page for now.
- While business pages remain mock-only, `WorkLogContext` uses backend `currentUser.employeeId` to select the matching mock employee. If the mock dataset has no matching employee, it uses a clearly marked temporary backend-profile fallback instead of silently using the first mock employee.

This mock identity alignment is only for frontend consistency during the mock phase. It is not authorization and is not used for backend security decisions.

## Role Switcher

The current Admin/Employee role switcher remains a development/demo UI tool only. It is controlled by `VITE_ENABLE_DEMO_ROLE_SWITCHER`.

It is not a security mechanism and must not be trusted by backend APIs. Real permissions and Employee/Admin visibility come from server-side authorization through `WorkLogUser`.

When enabled, the switcher is labeled as demo-only and is used only to preview mock UI states. It is not used for route-level authorization, backend API calls or security decisions.

## Customer Users

Customer login is prepared in Cognito, but the WorkLog customer portal is not enabled yet.

If Cognito authentication succeeds but `/api/Auth/Me` is rejected because customer access is disabled, the backend returns a generic authentication failure. The frontend keeps the Cognito session and shows the existing WorkLog access error:

```text
Your Cognito account is authenticated, but it is not enabled for WorkLog access.
```

The internal WorkLog shell is not rendered and no customer pages are exposed.

## Pending

- Customer portal and customer authorization rules.
- Connecting remaining business pages to real APIs: Dashboard, global Work Items, Time Entries, My Day, Approvals, Reports and Time Completeness. Settings, the Project area and Work Item Detail read-only are already integrated.
- Replacing residual page mock data with API-backed data where those pages are still mock-only.
- Password reset, MFA and signup flows.
- Handling advanced Cognito challenges beyond the basic sign-in result.
