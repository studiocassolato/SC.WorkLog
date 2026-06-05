# Final Pre-Dashboard Audit

## 1. Summary

This audit was run after the Customer Reports API integration and before any Dashboard redesign/API work.

Current API-backed areas are ready to be used as Dashboard data sources:

- Auth/current user;
- Settings Statuses, Employees and Customers;
- Projects list/detail/create/update;
- Project Economics, Payments, Contract Periods and Milestones;
- Project Detail Work Items and Time Entries;
- global Work Items and Work Item Detail;
- Work Item create/update/status-change;
- Add Time, global Time Entries, TimeEntry update and Admin ApprovedTime;
- My Day;
- leave request creation and approvals;
- overtime approvals;
- Time Completeness;
- Customer Reports.

Still intentionally pending:

- Dashboard;
- Work Item comments retrieval UI;
- customer portal;
- pagination on larger lists;
- official export/PDF delivery beyond Customer Reports client-side CSV from loaded backend rows.

No functional Dashboard changes were made during this audit.

## 2. Validation Results

Baseline validation before audit fixes:

- `dotnet build SC.WorkLog.sln`: passed, 0 warnings.
- `dotnet test SC.WorkLog.sln --no-build`: passed, 186 tests.
- `npm run build`: passed.
- `npm run lint`: passed.

Known warning:

- Vite reports a JavaScript chunk larger than 500 kB after minification. This remains a route-level lazy loading/code splitting follow-up.

## 3. API-Backed/Mock Boundary Status

The API-backed pages now use backend DTOs and service wrappers as the data source of truth. No raw business API calls bypassing `apiClient` were found; `apiClient` remains the only place that creates the Axios client and attaches bearer tokens.

Confirmed API-backed surfaces:

- Settings uses StatusConfig, Employee, Customer and WorkLogUser APIs.
- Projects and Project Detail use Project, WorkItem, TimeEntry and Project economics/payment/contract-period/milestone APIs.
- global Work Items and Work Item Detail use WorkItem APIs and backend status/reference data.
- Add Time, global Time Entries and My Day use TimeEntry APIs plus backend current user.
- Leave and overtime approvals use LeaveRequest and OvertimeRequest APIs.
- Time Completeness uses `TimeCompleteness/GetTimeCompleteness`.
- Customer Reports uses `Customer/GetCustomers`, `Project/SearchProjects` and `Report/GetCustomerReport`.

Mock data remains where expected:

- `Dashboard.tsx` uses `useWorkLog()` and local mock data.
- User Settings remains a mock/profile-preference screen.
- Mock comment data remains available because comments retrieval UI is intentionally deferred.
- `WorkLogContext` remains because Dashboard and a few deferred/mock-only surfaces still depend on it.

No mock fallback after API errors was found in the implemented business areas during this audit. API-backed pages generally expose loading, empty and error states; repeated page-level error parsers remain a cleanup item.

## 4. Security/Visibility Findings

Backend remains the authorization boundary.

Positive findings:

- `WorkLogUser` remains authoritative for application access.
- Customer users are still blocked during backend current-user resolution.
- Admin routes and navigation use backend `useAuth()` flags, not the demo role switcher.
- Admin-only controllers cover Settings, Project writes/economics/payments/contract periods/milestone writes, WorkItem writes, ApprovedTime, leave/overtime approvals, Time Completeness page routing and Customer Reports.
- Employee users can read all projects, project milestones and customers through authenticated read endpoints; project payment type and economic fields remain masked or Admin-only.
- Application services also enforce Admin guards for sensitive operations.
- Employee TimeEntry reads are scoped to `WorkLogUserContext.EmployeeId` in `TimeEntryService`.
- Employee TimeCompleteness reads are scoped to `WorkLogUserContext.EmployeeId` in `TimeCompletenessService`.
- Employee users cannot update ApprovedTime, create/update another employee's TimeEntries, approve/reject leave, approve/reject overtime, create/update Work Items, access Settings or access Customer Reports.

Sensitive field filtering is backend-owned:

- non-admin TimeEntry DTOs return null for `ApprovedTime`, `AdminNote`, employee level snapshot, default rate snapshot, project rate snapshot and calculated value;
- non-admin LeaveRequest DTOs return null for `AdminNote`;
- non-admin Project list/detail read models hide payment type, billing/rate fields, approved-hour summaries and team member levels;
- WorkItem approved hours are null for non-admin users;
- Customer Reports and Project Economics require Admin and are not exposed to Employee users.

Remaining security risks:

- authorization failures often surface as `ArgumentException` and therefore HTTP 400 through the current exception handler; production should map authorization failures to 403.
- fine-grained employee permissions and persisted project/customer visibility rules are not implemented.
- leave request `AdminNote` is currently returned by the leave DTO for employee-visible leave request reads; decide whether this is desired or should be masked like TimeEntry admin notes.
- request-body logging in `ExceptionsHandler` should be reviewed before production because notes/descriptions may contain sensitive text.

## 5. Business Flow Findings

Time & material flow:

- Project create/update is API-backed and Admin-only.
- WorkItem create/update/status-change is API-backed and Admin-only.
- Add Time creates backend TimeEntries and defaults `ApprovedTime` to logged `Time`.
- `TimeEntry/UpdateApprovedTime` updates approved hours and status for Admin users only.
- Payments are API-backed and project-type guarded.
- Project Economics uses approved time and payments from backend services.
- Customer Reports uses selected customer/date/project filters and approved-time based worked value from backend report data.

Annual retainer flow:

- Project create/update and contract period CRUD are API-backed.
- Contract periods are project-type guarded and overlap-validated.
- Add Time inside period feeds Project Economics through backend Annual Retainer calculators.
- Time Completeness remains independent from retainer economics and uses employee/day time, approved leave and overtime state.

Leave flow:

- Employee users can create their own Vacation/Permission requests from My Day.
- My Day displays selected-day leave requests and refreshes after creation.
- Admin users can approve/reject leave in Approvals.
- Approved leave contributes to Time Completeness.
- Pending/rejected leave does not contribute.

Overtime flow:

- `TimeEntryService` creates or updates pending OvertimeRequest records when daily total exceeds expected daily hours.
- Admin users see overtime requests in Approvals and can approve/reject them.
- Time Completeness reflects pending, approved and rejected overtime according to current domain rules.

WorkItem project move:

- Admin WorkItem updates can move a WorkItem to another Project.
- `WorkItemService` bulk-updates related `TimeEntry.ProjectId` records through the generic repository.
- Project Detail Time Entries and Project Economics query by `TimeEntry.ProjectId`, so moved entries follow the new Project.
- Existing TimeEntry project-rate snapshots are not recalculated by the WorkItem-level bulk move; decide whether historical snapshots should remain immutable or whether T&M moves should trigger a repair/update.
- The multi-document WorkItem save plus TimeEntry sync is not transactional yet; a MongoDB transaction or repair task remains a production hardening item.

## 6. Query/Performance Findings

Positive findings:

- Controllers remain thin.
- Mapping helpers do not perform repository calls.
- Services generally load scoped entity sets, build dictionaries/groupings and map in memory.
- Project Detail, Project Economics, TimeEntry lists and Customer Reports use denormalized `TimeEntry.ProjectId` where it matters.
- Customer Reports requires customer/date filters and, when supplied, project filter; it does not load unrelated customer data.
- WorkItems list uses backend filters for search, project, customer, assignee, unassigned, status typology/key, priority and include-closed.

Known acceptable pending items:

- several list endpoints are unpaginated;
- admin master data lists such as Employees, Customers, StatusConfig and WorkLogUser are still unpaginated;
- `TimeCompletenessService` loads active employees and date-range time/leave/overtime rows, then filters employee scope in memory;
- Dashboard-specific composition should not fan out many broad frontend calls once the Dashboard is implemented.

Endpoints to paginate before production-scale data:

- `Project/GetProjects` and `Project/SearchProjects`;
- `WorkItem/GetWorkItems`;
- `TimeEntry/GetTimeEntries`;
- `Employee/GetEmployees`;
- `Customer/GetCustomers`/`SearchCustomers`;
- `WorkLogUser/GetUsers`;
- leave/overtime request list endpoints if approval history grows.

## 7. Frontend/API Layer Findings

Positive findings:

- `apiClient` centralizes bearer-token attachment.
- No raw business `fetch` or raw business Axios usage was found outside `apiClient`.
- `worklog-api.ts` follows controller/action names and DTO naming closely.
- Frontend forms send request DTOs, not backend-owned fields such as `ProjectId`, `ApprovedTime`, rates or snapshots.
- API-backed pages do not use mock entities as authoritative data.
- Frontend calculations in Customer Reports are display-only groupings; backend totals remain authoritative.

Pending cleanup:

- `worklog-api.ts` is large and should eventually split by area: `project-api`, `workitem-api`, `time-entry-api`, `report-api`, `settings-api`, etc.
- repeated `getErrorMessage` helpers should become a shared small parser for `ErrorResponse.Errors`, 401/403 and network failures.
- route-level code splitting should be added before Dashboard grows the chart/reporting surface.
- the demo role switcher should remain disabled in API/auth verification environments.
- the globally mounted `WorkLogProvider` still feeds mock display state to the shell and Dashboard; remove or shrink that dependency once Dashboard is API-backed.

## 8. Documentation Fixes

Updated during this audit:

- `current-state-audit.md`: clarified that the audit state now extends through Customer Reports and Dashboard remains mock-only.
- `code-quality-audit.md`: refreshed the summary and recommendation heading from the old Work Items phase to the pre-Dashboard phase.
- `persistence-mongodb.md`: replaced the generic pending "replacement of frontend mock data" item with the current Dashboard-specific pending state.
- Added this document: `final-pre-dashboard-audit.md`.

Existing docs already correctly documented:

- API-backed Customer Reports;
- Admin-only report visibility;
- `TimeEntry.ProjectId` denormalization;
- WorkItem project move sync;
- leave/overtime approval flows;
- Time Completeness;
- customer portal disabled;
- comments retrieval UI pending.

## 9. Issues Fixed

No product code fixes were required.

Documentation fixes only:

- refreshed stale audit wording in `current-state-audit.md`;
- refreshed stale code-quality phase wording in `code-quality-audit.md`;
- clarified remaining persistence/mock pending work in `persistence-mongodb.md`;
- created this final pre-Dashboard audit.

No tests were added because the relevant service-level gaps are already covered by existing focused tests:

- Customer Reports Admin/customer/date/project isolation;
- Employee blocked from reports;
- TimeEntry sensitive DTO hiding;
- LeaveRequest `AdminNote` masking for non-admin reads;
- ApprovedTime Admin guard;
- Employee scoping for TimeEntries and TimeCompleteness;
- leave approval/rejection completeness behavior;
- overtime approval/rejection completeness behavior;
- `TimeEntry.ProjectId` creation/update and WorkItem project move sync.

Useful small tests to add when touching those areas next:

- Customer Reports exclusion of internal projects;
- expected behavior for project-rate snapshots after WorkItem project moves.

## 10. Issues Intentionally Left Pending

- Dashboard API integration and redesign.
- Work Item comments retrieval UI.
- Customer portal and customer-specific visibility rules.
- Pagination for larger list endpoints.
- Official export/PDF delivery.
- MongoDB data migrations for legacy WorkItem status fields and TimeEntry records without `ProjectId`.
- Automatic index creation strategy.
- Transaction/compensating workflow for WorkItem project move plus related TimeEntry sync.
- Decision on historical rate-snapshot behavior after WorkItem project moves.
- Optional masking policy for leave approval admin notes on employee-facing reads.
- Transaction/compensating workflow for Settings Employee/Customer plus linked WorkLogUser saves.
- Production auth hardening around audience/client-id configuration and authorization status codes.
- Frontend route-level code splitting.

## 11. Dashboard Readiness Assessment

Useful existing Dashboard concepts:

- period selector;
- logged/approved hours summary;
- pending leave and overtime approvals;
- missing-hours operational alert;
- unassigned Work Items;
- hours by customer/employee;
- project economics warnings for fixed price and annual retainer projects.

Widgets that are misleading if simply connected as-is:

- Annual retainer currently relies on legacy mock `annualAmount`; real data lives in contract periods and economics DTOs.
- Fixed price/retainer widgets calculate internal value locally from mock TimeEntries; real Dashboard should use backend economics/read models.
- Missing hours are locally calculated from mock rows; real Dashboard should use `TimeCompleteness/GetTimeCompleteness` or a dashboard-specific backend summary.
- Billable/internal values are locally recomputed; real Dashboard should not duplicate domain economics in frontend.
- Role gating inside `Dashboard.tsx` reads mock `useWorkLog().role`; route gating already uses backend `useAuth().isAdmin`.
- With the demo role switcher enabled, a real Admin can make the Dashboard show its in-page mock "Access Denied" by switching the demo role to Employee. The API-backed redesign should remove this duplicate mock-role check.

Existing endpoints that can support Dashboard:

- `Project/SearchProjects` and `Project/GetProject`;
- `Project/GetProjectEconomics`;
- `TimeEntry/GetTimeEntries`;
- `TimeCompleteness/GetTimeCompleteness`;
- `WorkItem/GetWorkItems`;
- `LeaveRequest/GetLeaveRequests`;
- `OvertimeRequest/GetOvertimeRequests`;
- `Customer/GetCustomers`;
- `Employee/GetActiveEmployees`;
- `Report/GetCustomerReport` for customer-specific drilldowns, not broad dashboard aggregation.

Dashboard-specific endpoints that would be better than many frontend calls:

- `Dashboard/GetAdminDashboardSummary` for top KPIs, approval counts, missing-hours counts, unassigned count and period totals.
- `Dashboard/GetOperationalAlerts` for missing hours, pending leave, pending overtime and unassigned priority WorkItems.
- `Dashboard/GetProjectEconomicsSnapshot` for top risky fixed price/T&M/retainer projects without one request per project.
- Optionally `Dashboard/GetTeamUtilizationSummary` for employee/day/week hours from backend-owned TimeCompleteness data.

Admin-only data:

- approved hours;
- rates and snapshots;
- calculated values, worked value, internal value and economics;
- payments and contract periods;
- leave/overtime approval queues;
- customer reports and broad customer/project financial summaries.

Employee dashboard direction:

- Keep My Day as the employee home for now. It already gives employees the most relevant daily workspace: own time entries, assigned priority work, leave request creation and completeness summary.
- Do not add a separate Employee Dashboard until there is a distinct product need beyond My Day.

Recommended Dashboard redesign scope:

- Redesign Dashboard as an Admin operational/economic command center, not a direct mock-data port.
- Use backend aggregation endpoints for summary cards and alert lists.
- Use existing API-backed detail pages as drilldowns: Approvals, Time Completeness, Work Items, Projects, Customer Reports.
- Keep the first redesign small: summary cards, approval/missing-hour alerts, unassigned work, and a focused project risk/economics snapshot.
- Add richer charts only after dashboard-specific backend contracts are in place.

## 12. Recommended Next Dashboard Implementation Plan

1. Define a backend Dashboard DTO surface first.
2. Add an Admin-only `DashboardController` with thin actions.
3. Add an application `DashboardService` that composes existing services/repositories and domain calculators.
4. Start with one endpoint: `GetAdminDashboardSummary(dateFrom, dateTo)`.
5. Include: total logged hours, total approved hours, pending leave count, pending overtime count, missing-hours count, unassigned open WorkItem count, active project count and high-risk project count.
6. Add one focused test class/slice for Admin-only access and customer/employee/economics visibility.
7. Replace `Dashboard.tsx` with API-backed loading/error/empty states and remove mock calculations from that page.
8. Keep My Day as the Employee landing page.
9. Defer chart-heavy widgets until backend aggregation and pagination contracts are stable.
