# WorkLog Code Quality Audit

## 1. Summary

This audit tracks code-quality findings across the API-backed slices completed through Customer Reports. The current implementation is stable enough to start a Dashboard redesign/API integration phase: the backend architecture remains layered, implemented business areas respect the API-backed/mock boundary, and validation passes.

Small fixes were applied during the audit:

- centralized frontend bearer-token attachment in `apiClient` by registering the token factory from `AuthProvider`;
- simplified `ProtectedRoute` so it no longer owns API token wiring;
- removed redundant hardcoded payment-type parameters from Project payment/contract-period creation service calls;
- added application-layer Admin guards for Project payment and contract-period read methods;
- added focused tests for those new guards;
- corrected `StatusConfigService.UpdateStatusConfig` so invariant validation uses the final updated status set;
- aligned stale mock/auth/application documentation with the current API-backed Settings and Project slices;
- updated a stale Annual retainer dialog label from "Contract periods pending" to "Contract periods".

## 2. Baseline Validation Results

Initial baseline before cleanup:

- `dotnet build SC.WorkLog.sln`: passed, 0 warnings.
- `dotnet test SC.WorkLog.sln --no-build`: passed, 125 tests.
- `npm run build`: passed.
- `npm run lint`: passed.

Final validation after cleanup:

- `dotnet build SC.WorkLog.sln`: passed, 0 warnings.
- `dotnet test SC.WorkLog.sln --no-build`: passed, 186 tests.
- `npm run build`: passed.
- `npm run lint`: passed.

Known warning:

- Vite still reports a large JavaScript bundle above 500 kB after minification. This remains a code-splitting follow-up, not a blocker.

## 3. Backend Architecture Findings

The intended architecture is still respected:

- controllers remain thin and delegate to application services;
- no controller repository access, calculations or try/catch blocks were found;
- Infrastructure still owns the MongoDB generic repository implementation;
- no entity-specific repositories were introduced;
- no MongoDB document classes were introduced;
- no EF, SQL migration or relational persistence concepts were introduced;
- Domain calculators own economics/completeness/overtime calculations.

The only small controller/service coupling found was Project payment/contract-period creation passing hardcoded payment types from `ProjectController`. That was removed; `ProjectService` now validates against the actual persisted project type.

## 4. Application Service Findings

Application services generally keep mapping helpers pure and perform composition with scoped queries, dictionaries and groupings. The important Project and WorkItem list/detail paths avoid repeated per-item repository calls for related projects, customers, employees, statuses and time entries. TimeEntry now stores backend-owned denormalized `ProjectId`, so project detail, project economics and customer report time queries can avoid first resolving all project WorkItem ids.

Issues fixed:

- `GetProjectPaymentsAsync` and `GetProjectContractPeriodsAsync` now require Admin at application-service level, matching their controller policies and data sensitivity.
- Two focused tests now cover Employee rejection for those sensitive read methods.
- `StatusConfigService.UpdateStatusConfig` now validates `existing.Where(x => x.Id != status.Id).Append(status)` after applying the requested update. This avoids relying on in-memory reference semantics and keeps MongoDB-loaded instances safe.

Items intentionally left pending:

- list endpoints such as `GetProjects`, `GetEmployees`, `GetCustomers` and `GetStatusConfigs` are currently unpaginated. This is acceptable for the current phase but should be addressed before larger datasets.
- `StatusConfigService` loads all statuses for invariant validation and default initialization. This is acceptable because statuses are reference data.
- Report and Project summary queries still rely on repository predicate scans where pagination/report windows are not yet formalized.
- Settings multi-step saves for Employee/Customer plus linked `WorkLogUser` remain non-transactional and need a compensating workflow or transaction strategy later.

## 5. Frontend/API Layer Findings

The frontend API boundary is now cleaner:

- `apiClient` is the only code attaching bearer tokens.
- no raw `fetch` or business API `axios` calls bypassing `apiClient` were found.
- API helper endpoint names follow the `api/[controller]/[action]` convention.
- TypeScript DTOs for Projects, Project economics, payments, contract periods, milestones, StatusConfig and Work Items match the current backend enum/string model.
- `worklog-api.ts` is large but still cohesive enough for this phase.

Pending cleanup:

- consolidate repeated `getErrorMessage` helpers in dialogs/pages into a shared small frontend helper;
- consider splitting `worklog-api.ts` later by area, for example `project-api.ts`, `settings-api.ts`, `workitem-api.ts`, once more pages are API-backed;
- decide whether Project Detail should consume backend `ProjectCapabilitiesDto` in addition to `useAuth().isAdmin` before introducing more granular permissions;
- keep `VITE_ENABLE_DEMO_ROLE_SWITCHER=false` in environments used for auth/API verification;
- add route-level lazy loading/code splitting to reduce the current bundle warning.

## 6. Project Area Findings

The Project area respects the intended API-backed scope:

- Projects list/search uses backend APIs only.
- Project Detail base data uses `Project/GetProject`.
- Project create/update uses backend APIs and reloads backend data.
- Project Economics uses `Project/GetProjectEconomics` and does not recompute authoritative economics from mock data.
- Project Payments and Project Contract Periods are Admin-only, payment-type-specific and backend-backed for list/create/update/delete.
- Project Milestones are read from backend Project Detail for all employee users; milestone write flows remain Admin-only.
- Project Detail Work Items tab uses `WorkItem/GetWorkItems` filtered by `projectId` and `includeClosed=true`.
- Project Detail Time Entries tab uses `TimeEntry/GetTimeEntries` filtered by `projectId`.
- Global Time Entries, Add Time, normal TimeEntry update and Admin ApprovedTime use `TimeEntry/GetTimeEntries`, `TimeEntry/CreateTimeEntry`, `TimeEntry/UpdateTimeEntry` and `TimeEntry/UpdateApprovedTime`.
- My Day uses `TimeEntry/GetTimeEntries`, `LeaveRequest/GetLeaveRequests`, `LeaveRequest/CreateLeaveRequest`, assigned Work Items from `WorkItem/GetWorkItems`, and `TimeCompleteness/GetTimeCompleteness` for backend-owned daily summary.
- Approvals uses `LeaveRequest/GetLeaveRequests`, `LeaveRequest/ApproveLeaveRequest`, `LeaveRequest/RejectLeaveRequest`, `OvertimeRequest/GetOvertimeRequests`, `OvertimeRequest/GetOvertimeRequest`, `OvertimeRequest/ApproveOvertimeRequest` and `OvertimeRequest/RejectOvertimeRequest` for leave/permission and overtime approval workflows.
- Time Completeness uses `TimeCompleteness/GetTimeCompleteness` for backend-owned expected, worked, approved leave, missing and overtime status values.
- Customer Reports uses `Report/GetCustomerReport` for backend-owned customer/date/project report rows and totals.
- TimeEntry, LeaveRequest and Project DTO mappings hide ApprovedTime, AdminNote, employee level snapshots, rate snapshots, calculated values, project payment type and billing fields from non-admin responses at the backend layer.
- Work Item row/card navigation opens the API-backed Work Item Detail route, which loads read-only data through `WorkItem/GetWorkItem`.
- Global Work Items uses `WorkItem/GetWorkItems` with backend filters for search, project, customer, assignee, unassigned-only, status key, priority and include-closed.
- Work Item create/update/status-change uses `WorkItem/CreateWorkItem` and `WorkItem/UpdateWorkItem` for Admin users. Status selection comes from active `StatusConfig` records, assignees come from active Employees, and successful saves reload the API-backed list/detail.
- Work Item project moves synchronize related `TimeEntry.ProjectId` records with a generic repository bulk field update. This should still be revisited for MongoDB transactions or compensating repair before high-consistency production use.

No fallback to mock project/payment/contract-period/milestone data was found in API-backed Project Detail.

Pending Project-adjacent items:

- Work Item comments retrieval/write UI remains separate integration work.
- Work Item list pagination and origin filtering are still pending.
- Project list/search pagination remains pending.

## 7. Auth/Security Findings

Current auth behavior remains aligned with the intended model:

- frontend sends the configured Cognito ID token;
- backend validates `token_use = id`;
- `/api/Auth/Me` returns `CurrentUserResponse`;
- route/navigation visibility uses backend current user;
- `WorkLogUser` remains the source of application role/access;
- Customer users remain blocked during current-user resolution;
- `AdminOnly` policy is used consistently for admin controllers;
- application services enforce guards for security-sensitive operations, including the Project payment/contract-period read guards added in this audit.

Production hardening still pending:

- fail startup when required Cognito authority/client settings are missing in non-development environments;
- make audience/client-id validation explicit rather than relying on `ValidateAudience = false` plus manual checks;
- consider a short-lived current-user cache to reduce auth-time repository lookups;
- ensure auth failures are consistently surfaced as 401/403 without leaking operational detail.

## 8. Mock Boundary Findings

The current boundary is respected.

API-backed:

- Auth/current user;
- Settings Statuses, Employees and Customers;
- Projects list/detail/create/update;
- Project Economics;
- Project Payments;
- Project Contract Periods;
- Project Milestones;
- Project Detail Work Items tab;
- Project Detail Time Entries tab;
- global Work Items;
- Work Item Detail create/update/status-change;
- global Time Entries;
- Add Time/create TimeEntry UI;
- My Day;
- Leave request creation and approvals;
- Overtime approvals;
- Time Completeness;
- Customer Reports;
- TimeEntry update;
- Admin ApprovedTime editing.

Mock-only/pending:

- Work Item comments retrieval UI;
- Dashboard.

Mock data should remain for the pending pages. Removing it now would break pages intentionally outside this phase.

## 9. Issues Fixed

- Centralized bearer token setup in `AuthProvider` and removed token wiring from `ProtectedRoute`.
- Removed manual `Authorization` header construction for `/Auth/Me`.
- Removed redundant `ProjectPaymentType` parameters from `ProjectService.CreateProjectPaymentAsync` and `ProjectService.CreateProjectContractPeriodAsync`.
- Updated `ProjectController` and backend tests for the simplified service signatures.
- Added Admin guards to Project payment/contract-period list service methods.
- Added two service tests for Employee access rejection on those sensitive reads.
- Fixed final-set invariant validation in `StatusConfigService.UpdateStatusConfig`.
- Updated stale documentation in `frontend-mock-model.md`, `application-layer.md`, `current-state-audit.md` and `frontend-auth-cognito.md`.
- Updated stale Annual retainer dialog text.
- Test counts in the audit documents now reflect the current 186-test suite.

## 10. Issues Intentionally Left Pending

- API pagination and larger-dataset query strategy for list/search endpoints.
- Shared frontend error-response parsing helper.
- Project Detail `capabilities` DTO consumption for future finer-grained permissions.
- Demo role switcher confusion on mock-only pages in development.
- Potential future split of `worklog-api.ts` by functional area.
- Potential extraction of large `ProjectDetail` and `Settings` sections into smaller components.
- Frontend bundle code splitting/lazy routes.
- MongoDB data migration from legacy WorkItem status fields to `StatusKey`.
- MongoDB data migration for existing TimeEntry records without denormalized `ProjectId`.
- Customer portal and customer-specific visibility rules.
- Dashboard TimeEntry consumers still use mock data or pending UI.
- Work Item comments retrieval UI.
- Transaction or compensating strategy for multi-step Settings saves.

## 11. Recommended Next Steps Before Dashboard

No additional cleanup is required before starting the Dashboard phase.

Recommended order:

1. Add comments retrieval UI after the Jira/comment sync strategy is decided.
2. Add pagination/origin filtering to `WorkItem/GetWorkItems` before larger datasets.
3. Add Project Detail Add Work Item shortcut if product flow needs project-context creation.
4. Continue mock-data replacement with Dashboard after the report and approval/completeness flows stabilize.
