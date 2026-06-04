# WorkLog Current State Audit

## 1. Summary

This audit describes the WorkLog implementation after the first API integration slices: authentication/current user, Settings and the Project area. Remaining business pages still use mock data.

Overall state:

- Backend Domain, Application, MongoDB persistence, API controllers and Cognito current-user resolution are implemented at an initial but coherent level.
- Frontend authentication is integrated with Cognito and `/api/Auth/Me`; Settings Statuses/Employees/Customers plus Projects list/base detail/create/update, Project Detail Economics, Project Payments, Project Contract Periods, Project Milestones, Project Detail Work Items and Work Item Detail read-only are API-backed, while the remaining business pages still use mock data.
- `WorkLogUser` is the authoritative application authorization model. `Employee` is operational/HR data only.
- Customer users remain intentionally blocked during backend current-user resolution.
- The main remaining risks are API pagination/filter breadth, incomplete frontend API integration, pending customer visibility rules, and a large frontend bundle.

Small stabilization fixes applied during this audit:

- Backend now rejects non-ID Cognito tokens by validating `token_use = id`.
- Backend current-user resolution failures now log operational detail server-side while returning a generic authentication failure to the client.
- Frontend clears Cognito Hosted UI `?null` error redirects.
- `/api/Auth/Me` now returns the stable Application DTO `CurrentUserResponse`.
- Frontend current-user typing now matches that DTO response shape without anonymous-response normalization.
- Work item create/update and comment ownership are now guarded in `WorkItemService`.
- Work item statuses are freely configurable through `StatusConfig`, grouped by fixed `WorkItemStatusTypology`, and referenced by stable `StatusKey`.
- `StatusConfigService.UpdateStatusConfig` validates the final updated status set, so deactivating or retagging statuses cannot bypass active New/closed invariants.
- `WorkLogContext.currentUser` now aligns mock-only pages to backend `currentUser.employeeId` when possible.
- Documentation was updated for ID-token usage, `SCWorkLog` local DB, implemented controllers/auth, and frontend mock boundary.

## 2. What Is Implemented And Working

Implemented backend areas:

- Domain aggregate roots for employees, customers, projects, work items, time entries, leave/overtime requests, payments, retainer periods, status config and WorkLog users.
- Domain calculators for time & material, fixed price, annual retainer, internal economics, daily completeness and overtime.
- Application services and DTOs for the main WorkLog areas.
- Generic MongoDB repository registration and index definitions.
- Initial WebApp API controllers using the `api/[controller]/[action]` convention.
- Cognito JWT bearer auth in `SC.WorkLog.WebApp`.
- Server-side current user via `/api/Auth/Me`, returning `CurrentUserResponse`.
- AdminOnly policy based on `WorkLogUserType.Employee` plus `WorkLogUserRole.Admin`.
- ConsoleTester seed for the local admin user in MongoDB database `SCWorkLog`.
- ConsoleTester exposes an explicit `EnsureDefaultStatuses` command for local/development initialization of default Work Item statuses only.

Implemented frontend areas:

- Cognito Hosted UI/email login shell.
- ID token bearer attachment through centralized `apiClient`.
- Backend current-user loading from `/api/Auth/Me` with the frontend type aligned to `CurrentUserResponse`.
- Protected route gating that requires Cognito authentication and successful backend current-user resolution.
- Top bar and navigation visibility based on backend current user.
- Mock-only page identity alignment from backend `currentUser.employeeId` when a matching mock employee exists.
- Projects list, base Project Detail, Project create/update, Project Detail Economics, Project Payments, Project Contract Periods, Project Milestones, Project Detail Work Items and Work Item Detail read-only now use backend APIs.
- Settings currently includes Statuses, Customers and Employees. Statuses and Employees/Customers are API-backed; Employees/Customers manage related `WorkLogUser` records behind the scenes.
- Demo role switcher retained as demo-only UI preview.

Not implemented by design:

- API integration for business pages outside Settings and Projects.
- Customer portal and customer-specific visibility.
- Replacing mock data.
- Export/report delivery.
- Fine-grained permissions beyond `AdminOnly` and service guards.

## 3. Build/Test/Lint Results

Commands requested for validation:

- `dotnet build SC.WorkLog.sln`
- `dotnet test SC.WorkLog.sln --no-build`
- `npm run build`
- `npm run lint`

Current validation result:

- `dotnet build SC.WorkLog.sln`: passed.
- `dotnet test SC.WorkLog.sln --no-build`: passed, 130 tests.
- `npm run build`: passed.
- `npm run lint`: passed.

Known warnings:

- Vite reports a large JavaScript bundle above 500 kB after minification. This is not addressed in this audit phase.
- No .NET build warnings were reported during the latest validation.

## 4. Auth Flow Status

Current flow:

1. Frontend authenticates with Cognito through Amplify.
2. Frontend retrieves a Cognito ID token.
3. `apiClient` attaches `Authorization: Bearer <id-token>`.
4. ASP.NET Core JWT bearer validates issuer, signature and lifetime.
5. `OnTokenValidated` validates configured client id using `aud`/`client_id`.
6. `OnTokenValidated` now validates `token_use = id`.
7. Backend resolves `WorkLogUser` by Cognito `sub`, with email fallback.
8. Backend rejects missing/inactive WorkLog users and customer users.
9. Backend enriches claims with WorkLog user id, user type, role, employee id and customer id.
10. `/api/Auth/Me` returns `CurrentUserResponse` with server-side current-user context.
11. Frontend uses that current user for route and navigation visibility.

Important findings:

- The frontend correctly sends ID tokens now. This is required because Cognito access tokens did not reliably include `email` for the federated Azure AD flow.
- Backend validation is now aligned with that choice through `token_use = id`.
- The local WebApp and ConsoleTester are aligned on MongoDB database `SCWorkLog`.
- Customer users are currently blocked by `WorkLogUserService.ResolveAuthenticatedUser`.
- Missing, inactive and customer WorkLog users fail authentication with server-side detail logging and a generic client failure.

Residual auth risks:

- `ValidAudience` exists in settings but is not used as a separate setting; client validation uses `ClientId`.
- `ValidateAudience` is currently false and client validation is implemented manually in `OnTokenValidated`. This is acceptable for the current prototype, but production hardening should fail startup when authority/client id are missing and should make audience/client validation explicit.
- Backend current-user response is now a stable DTO. The frontend type expects that explicit response shape.
- Cognito app client/provider configuration remains environment-dependent and should be documented in deployment/runbook material.

## 5. Backend/API Status

Controller convention is followed:

- `[Authorize]`
- `[ApiController]`
- `[Produces("application/json")]`
- `[Route("api/[controller]/[action]")]`
- `Task<IActionResult>`
- service call followed by `Ok(response)`

Available authenticated endpoints:

- `Auth/Me`
- `StatusConfig/GetStatusConfigs`
- `Project/GetProjects`, `Project/SearchProjects`, `Project/GetProject`
- `WorkItem/GetWorkItems`, `WorkItem/GetWorkItem`, `WorkItem/AddComment`
- `TimeEntry/GetTimeEntries`, `TimeEntry/CreateTimeEntry`, `TimeEntry/UpdateTimeEntry`
- `LeaveRequest/GetLeaveRequests`, `LeaveRequest/CreateLeaveRequest`

Available admin-only endpoints:

- `Employee/GetEmployees`, `Employee/GetActiveEmployees`, `Employee/GetEmployee`, `Employee/CreateEmployee`, `Employee/UpdateEmployee`
- `Customer/GetCustomers`, `Customer/SearchCustomers`, `Customer/GetCustomer`, `Customer/CreateCustomer`, `Customer/UpdateCustomer`
- `WorkLogUser/GetUsers`, `WorkLogUser/GetUser`, `WorkLogUser/CreateUser`, `WorkLogUser/UpdateUser`
- `StatusConfig/CreateStatusConfig`, `StatusConfig/UpdateStatusConfig`, `StatusConfig/EnsureDefaultStatuses`
- `WorkItem/CreateWorkItem`, `WorkItem/UpdateWorkItem`
- `Project/CreateProject`, `Project/UpdateProject`, `Project/GetProjectEconomics`
- `Project/GetProjectPayments`, `Project/CreateProjectPayment`, `Project/UpdateProjectPayment`, `Project/DeleteProjectPayment`
- `Project/GetProjectContractPeriods`, `Project/CreateProjectContractPeriod`, `Project/UpdateProjectContractPeriod`, `Project/DeleteProjectContractPeriod`
- `Project/CreateMilestone`, `Project/UpdateMilestone`, `Project/DeleteMilestone`
- `TimeEntry/UpdateApprovedTime`
- `LeaveRequest/ApproveLeaveRequest`, `LeaveRequest/RejectLeaveRequest`
- `OvertimeRequest/GetOvertimeRequests`, `OvertimeRequest/GetOvertimeRequest`, `OvertimeRequest/ApproveOvertimeRequest`, `OvertimeRequest/RejectOvertimeRequest`
- `Report/GetCustomerReport`
- `TimeCompleteness/GetTimeCompleteness`

Controller audit findings:

- Controllers are thin.
- No repository access was found in controllers.
- No try/catch was found in controllers.
- No domain calculation logic was found in controllers.
- `WorkLogControllerBase` only adapts `ICurrentUser` to `WorkLogUserContext`.
- `AddWorkItemCommentRequest` now lives in Application DTOs and no longer accepts comment author `EmployeeId`.
- `StatusConfig` no longer stores `IsClosed` or `IsInitial`; closed/open behavior and default initial status are derived from typology and order.
- `ProjectController.CreateProjectPayment` and `CreateProjectContractPeriod` pass hardcoded expected payment types to service methods. The service still validates against the actual project, but this is minor controller/service coupling to clean up later.

Work item write/comment authorization status:

- `WorkItem/CreateWorkItem` and `WorkItem/UpdateWorkItem` are Admin-only at controller policy level and guarded again in `WorkItemService`.
- `WorkItem/AddComment` remains available to authenticated employee/admin users, but the service takes the author from `WorkLogUserContext.EmployeeId`.
- Comment requests no longer trust frontend employee ids for authorship.

Endpoints intentionally absent:

- `GetComments`
- Customer portal endpoints

## 6. Frontend Status

Current frontend state:

- Auth/current-user shell is API-backed.
- Business pages outside Settings and Projects are still mock-only.
- `apiClient` centralizes Authorization header injection.
- No raw `axios` or `fetch` business API calls were found outside `apiClient`/auth usage.
- `ProtectedRoute` blocks the app shell if backend current-user resolution fails.
- Sidebar, mobile nav and admin routes use backend current-user flags.
- `WorkLogContext` keeps mock page state, synchronizes its demo role to backend role and selects the mock current user by backend `currentUser.employeeId` when possible.

Navigation status:

- Admin sees admin areas and employee-accessible areas.
- Employee sees employee-accessible areas.
- Customer users are blocked before shell rendering.
- Settings exposes Customers and Employees backed by API data. Projects list/detail/create/update, Project Detail Economics, Project Payments, Project Contract Periods, Project Milestones, Project Detail Work Items and Work Item Detail read-only are also backend-backed. A separate WorkLog Users page is intentionally not present; `WorkLogUser` is managed behind those screens.

Role-switcher status:

- Demo role switcher remains controlled by `VITE_ENABLE_DEMO_ROLE_SWITCHER`.
- It is marked as demo UI only.
- It does not protect routes or authorize API calls.
- It can still affect mock page conditional rendering because mock pages read `useWorkLog().role`; this is acceptable only while pages are mock-only, but can confuse QA because route/nav use backend role while page internals use mock role.

Mock identity status:

- `WorkLogContext.currentUser` is no longer silently the first mock employee after backend current-user resolution.
- If backend `currentUser.employeeId` matches a mock employee id, mock-only flows use that employee.
- If no matching mock employee exists, the frontend uses a clearly marked temporary backend-profile fallback with the backend employee id. Related mock-only rows may be empty until those pages are API-backed.

Settings API integration status:

- Company Settings is removed from the current scope. Company profile/report branding can be reintroduced later if needed.
- Statuses Settings loads and manages configurable Work Item statuses through the `StatusConfig` API.
- Status names are free internal workflow labels. `WorkItemStatusTypology` gives fixed business meaning: New, InProgress, WaitingInternal, WaitingCustomer, Closed or Archived.
- Multiple statuses can share a typology. Customer display names can hide internal statuses, for example Code review can display as In progress.
- `StatusConfig.Id` remains the technical aggregate id. `StatusConfig.Key` is the stable readable unique kebab-case reference; `Name` is editable and is not used as the key.
- Work items now reference `StatusKey` as their actual workflow status. DTOs expose status key, status name, typology, customer display name and computed closed/open state.
- Default Work Item statuses can be initialized explicitly with `dotnet run --project SC.WorkLog.ConsoleTester -- EnsureDefaultStatuses`; the command is idempotent and does not seed employees, users, customers, projects, work items or time entries.
- Closed/open behavior is derived from typology: Closed and Archived are closed; New, InProgress, WaitingInternal and WaitingCustomer are open.
- The default initial status is the first active status ordered by Order where typology is New.
- Employees Settings loads and saves Employee data through the `Employee` API.
- Employee application access creates, updates or deactivates linked Employee-type `WorkLogUser` records.
- Customers Settings loads and saves Customer data through the `Customer` API.
- Customer portal users create, update or deactivate Customer-type `WorkLogUser` records.
- Customer portal users can be modeled, but customer portal access remains blocked during current-user resolution.
- These multi-step saves are not transactional; the UI reports when profile save succeeds but access/user configuration fails.
- Settings uses `WorkLogUser/GetUsers` with server-side filters for employee/customer linkage. Pagination remains pending.
- Expected daily hours remain stored per Employee. Leave/permission/overtime approvals remain admin workflow concerns, not company-level settings.
- Projects list uses `Project/GetProjects` or `Project/SearchProjects`; Project Detail uses `Project/GetProject`; Admin project create/update uses `Project/CreateProject` and `Project/UpdateProject`; Project Detail Economics uses `Project/GetProjectEconomics`; Project Payments uses `Project/GetProjectPayments`, `Project/CreateProjectPayment`, `Project/UpdateProjectPayment` and `Project/DeleteProjectPayment` for Time & material projects; Project Contract Periods uses `Project/GetProjectContractPeriods`, `Project/CreateProjectContractPeriod`, `Project/UpdateProjectContractPeriod` and `Project/DeleteProjectContractPeriod` for Annual retainer projects; Project Milestones use `Project/CreateMilestone`, `Project/UpdateMilestone` and `Project/DeleteMilestone`; Project Detail Work Items uses `WorkItem/GetWorkItems` filtered by `ProjectId`; Work Item Detail uses `WorkItem/GetWorkItem` in read-only mode. Work Item create/update/status-change, comments retrieval UI and project Time Entries remain pending and do not show mock data for API-loaded projects.

## 7. MongoDB/Persistence Status

Persistence findings:

- Generic `IRepository<TEntity>` is preserved.
- No entity-specific repositories were introduced.
- Domain entities are used as collection models.
- No `*Document` persistence models were found.
- Collection naming uses `typeof(TEntity).Name`.
- MongoDB conventions serialize enums as strings and ignore nulls.
- `Guid` serializer is configured with standard representation.
- Index definitions exist in `WorkLogDatabaseIndexes`.
- `WorkLogUser` indexes are configured and documented.
- `CognitoSub` sparse unique index limitation is documented.
- No SQL/EF/migration concepts were introduced.

Operational gap:

- Index creation is explicit but not automatically executed at host startup. This is documented and remains pending.

## 8. Security Findings

Positive findings:

- Admin endpoints have route-level `AdminOnly` where expected.
- Application services also enforce admin guards for economics, approved time, user management, reports and overtime admin flows.
- Work item create/update are Admin-only in `WorkItemService`, and comments are authored from server-side current employee context.
- Employee self/admin guards exist for own time entries and leave creation.
- Customer users are blocked during current-user resolution.
- Economic values and approved time are generally hidden from non-admin DTO mapping paths.
- No silent WorkLogUser auto-creation occurs during authentication.
- Frontend does not fall back to demo role after backend auth failure.
- `/api/Auth/Me` exposes only current-user context fields, not tokens.

Findings to address later:

- Cognito IDs currently appear in local appsettings/env files. These are not secrets, but production values should move to environment-specific configuration.
- Current-user response uses `CurrentUserResponse`; keep it as the shared contract when adding future profile fields.
- Fine-grained permissions beyond `AdminOnly` are not implemented.
- Permission failures currently often surface as `ArgumentException` and therefore HTTP 400 through `ExceptionsHandler`; authorization failures should eventually map to 403.
- `ExceptionsHandler` logs request bodies where seekable. This can include notes or other PII and should be reviewed before production.

## 9. Performance Findings

Positive findings:

- Large collection flows generally load scoped data first and compose in memory.
- Mapping helpers in Application services are pure and do not perform hidden DB calls.
- Project/customer reports load related data in batches.

Potential issues:

- Several list endpoints are unpaginated.
- Admin list endpoints such as users, employees and customers still load full collections; Settings currently uses them for initial master data, but this should be revisited before production scale.
- `ProjectService.GetProjectsAsync` loads all projects; search/filter endpoint exists and should be preferred for large data.
- `TimeCompletenessService` loads all active employees, all time entries, approved leaves and overtime requests in the date range, then filters some employee scope in memory.
- JWT validation resolves WorkLog user/employee from MongoDB on every authenticated request; a short-lived cache could reduce DB load.
- Dashboard and report pages remain mock-only; real API integration must avoid broad unfiltered report calls.
- Frontend bundle is large; route-level lazy loading and chart splitting should be future work.

Domain/application behavior to review before production:

- `TimeEntryService.UpdateTimeEntryAsync` can change logged time after approval without resetting or reconciling approved time/status.
- `TimeAndMaterialEconomicsCalculator` uses `ApprovedTime * ProjectRateSnapshot` and does not use the fallback rate used in `TimeEntryService` DTO mapping.
- Leave requests do not currently prevent duplicate requests for the same employee/date.
- Overtime creation/update happens as a side effect of time entry changes without a transaction.

## 10. Documentation Mismatches Fixed

Fixed during this audit:

- `backend-auth-cognito.md` now says frontend sends ID tokens and backend validates `token_use = id`.
- `application-layer.md` no longer says persistence/API controllers/auth are not implemented.
- `persistence-mongodb.md` now documents standard Guid serialization and local DB `SCWorkLog`.
- `persistence-mongodb.md` no longer lists API controllers/frontend auth/Cognito as pending.
- `frontend-mock-model.md` now states auth/current-user shell is backend-backed while business pages remain mock-only.

## 11. Issues Found And Fixed

Fixed:

- Backend did not explicitly reject non-ID tokens after frontend switched to ID tokens. Added `token_use = id` validation.
- Backend user-resolution failures could expose operational details through authentication failure messages. They now return a generic failure and log details server-side.
- Work item write/comment authorization accepted too much frontend-owned state. Create/update are now Admin-only in Application services, and comments use server-side current employee ownership.
- Frontend mock identity was pinned to the first mock employee. It now aligns to backend `currentUser.employeeId` when possible and otherwise uses a marked temporary fallback.
- Frontend returned Cognito Hosted UI `?null` errors but did not clear that URL form. Added cleanup support.
- Documentation mismatches listed above.
- Settings Employees/Customers were connected to APIs and now manage `WorkLogUser` records behind the scenes instead of requiring a separate Users page.
- Company Settings was removed from the current Settings scope.
- Work Item status configuration now uses free status names grouped by `WorkItemStatusTypology`; stored `IsClosed` and `IsInitial` were removed.

Validation after fixes:

- `dotnet build SC.WorkLog.sln`: passed.
- `dotnet test SC.WorkLog.sln --no-build`: passed, 130 tests.
- `npm run build`: passed with the existing Vite large-bundle warning.
- `npm run lint`: passed.

## 12. Issues Found But Left Pending

Pending by design:

- Replace remaining frontend mock data with API-backed pages, excluding Settings, Projects list/base detail/create/update, Project Detail Economics, Payments, Contract Periods, Milestones, Project Detail Work Items and Work Item Detail read-only already connected.
- Decide whether additional admin pages are needed beyond Settings Statuses/Customers/Employees. A separate WorkLog Users page is intentionally deferred.
- Implement customer portal and customer-specific authorization/visibility.
- Implement project/customer visibility rules backed by persisted permissions.
- Add pagination to list endpoints, including project list/search if project volume grows.
- Add pagination to WorkLogUser admin queries if user volume grows.
- Decide whether MongoDB index creation should be called by a task, deployment step or admin command.
- Add WorkItem comments retrieval endpoint if comments need API-backed UI.
- Add a MongoDB data migration for existing WorkItem records that still have the old enum-based `Status` field or interim `StatusConfigId` instead of `StatusKey`. No production migration is included in this phase; local/dev data may be cleared and reseeded. Real data should map old `Open`/`New` to `new`, `InProgress` to `in-progress`, `OnHold` to `waiting-for-customer` or `under-analysis` depending on meaning, `Completed`/`Closed` to `closed`, and `StatusConfigId` by looking up `StatusConfig.Key`.
- Add bundle code splitting/lazy routes.
- Harden JWT/audience/client-id configuration and auth failure messages.
- Add service/security integration tests for JWT current-user resolution, WorkItem writes, TimeEntry approved-time behavior and policy enforcement.
- Decide whether customer login form should be disabled while the customer portal remains blocked.

## 13. Recommended Next Steps

Recommended next implementation phase:

1. Integrate the next API-backed page slice end-to-end, preferably a low-risk read-only list or work item flow.
2. Add pagination/filter contracts before connecting large lists.
3. Add integration tests around Cognito current-user resolution using representative ID-token claims.
4. Keep mock-data replacement incremental: one page/flow at a time.
