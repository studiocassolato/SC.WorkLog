# WorkLog Frontend API Integration

This document tracks frontend areas that are backed by the WorkLog API.

## Current API-Backed Areas

- Authentication shell and current-user resolution use `/api/Auth/Me`.
- Projects list, base Project Detail, Project create/update, Project Detail Economics, Project Payments, Project Contract Periods, Project Milestones, Project Detail Work Items tab, Project Detail Time Entries tab, global Work Items, Work Item Detail, global Time Entries, Add Time, My Day, Approvals, Time Completeness, Customer Reports, TimeEntry update and Admin ApprovedTime are API-backed through `Project/GetProjects`, `Project/SearchProjects`, `Project/GetProject`, `Project/CreateProject`, `Project/UpdateProject`, `Project/GetProjectEconomics`, `Project/GetProjectPayments`, `Project/CreateProjectPayment`, `Project/UpdateProjectPayment`, `Project/DeleteProjectPayment`, `Project/GetProjectContractPeriods`, `Project/CreateProjectContractPeriod`, `Project/UpdateProjectContractPeriod`, `Project/DeleteProjectContractPeriod`, `Project/CreateMilestone`, `Project/UpdateMilestone`, `Project/DeleteMilestone`, `WorkItem/GetWorkItems`, `WorkItem/GetWorkItem`, `WorkItem/CreateWorkItem`, `WorkItem/UpdateWorkItem`, `TimeEntry/GetTimeEntries`, `TimeEntry/CreateTimeEntry`, `TimeEntry/UpdateTimeEntry`, `TimeEntry/UpdateApprovedTime`, `LeaveRequest/GetLeaveRequests`, `LeaveRequest/CreateLeaveRequest`, `LeaveRequest/ApproveLeaveRequest`, `LeaveRequest/RejectLeaveRequest`, `OvertimeRequest/GetOvertimeRequests`, `OvertimeRequest/GetOvertimeRequest`, `OvertimeRequest/ApproveOvertimeRequest`, `OvertimeRequest/RejectOvertimeRequest`, `TimeCompleteness/GetTimeCompleteness` and `Report/GetCustomerReport`.
- Settings includes only Statuses, Customers and Employees.
- Settings Statuses uses `StatusConfig` API endpoints for configurable Work Item workflow statuses.
- Settings Employees uses `Employee` API endpoints for operational/HR employee data.
- Settings Customers uses `Customer` API endpoints for customer company data.
- Settings manages `WorkLogUser` records behind the Employees and Customers screens.

The Company Settings tab is not part of the current scope. Expected daily hours are employee-level data, and leave/permission/overtime approvals are handled by admin approval flows. A minimal company profile for report/PDF branding can be added later if needed.

## Projects API Integration

Projects list uses backend `ProjectListItemDto` data for project name, customer name, default-project flag, payment type, status, logged hours, work item count and open work item count. Search, status and payment-type filters call `Project/SearchProjects`; the unfiltered view calls `Project/GetProjects`. Payment type remains visible/filterable only for Admin users.

Admin users can create and update base Project fields through `Project/CreateProject` and `Project/UpdateProject`. The form uses backend current-user authorization, loads customers from `Customer/GetCustomers`, prefers active customers in the selector, and supports customer, project name, payment type, status, default-project flag and notes. The backend enforces at most one default project per customer.

Payment-type-specific project fields:

- Time & material: junior, mid and senior rates.
- Fixed price: fixed amount.
- Annual retainer: no project-level annual amount; retainer amounts remain managed by Contract Periods.
- Internal: no economic setup required.

Project Detail uses `Project/GetProject` for base project information, customer info, notes, milestones, hours summary, work item summary and team summary. Admin users can create, update and delete milestones through `Project/CreateMilestone`, `Project/UpdateMilestone` and `Project/DeleteMilestone`; successful writes reload Project Detail. The Project Detail Work Items tab uses `WorkItem/GetWorkItems` with `projectId` and `includeClosed=true`, so it does not load all Work Items and filter client-side. Work Item rows/cards navigate to the API-backed Work Item Detail route. The Project Detail Time Entries tab uses `TimeEntry/GetTimeEntries` with `projectId`, and it shows backend rows without falling back to mock TimeEntries. TimeEntry create/update events refresh Project Detail Time Entries and Project Economics.

Project Detail Economics uses `Project/GetProjectEconomics` and no longer performs mock calculations from frontend WorkItems or TimeEntries. The backend response is the source of truth for Time & material, Fixed price, Annual retainer and Internal project economics. Annual retainer amounts come from Contract Periods; if no contract period exists, the UI shows a clear empty state rather than falling back to legacy mock `annualAmount` fields.

Project Payments are API-backed for Time & material projects. Admin users can list, create, update and delete payments through `Project/GetProjectPayments`, `Project/CreateProjectPayment`, `Project/UpdateProjectPayment` and `Project/DeleteProjectPayment`. Payment saves/deletes refresh the Payments tab and Project Economics data so Time & material balances reflect the latest backend state.

Project Contract Periods are API-backed for Annual retainer projects. Admin users can list, create, update and delete periods through `Project/GetProjectContractPeriods`, `Project/CreateProjectContractPeriod`, `Project/UpdateProjectContractPeriod` and `Project/DeleteProjectContractPeriod`. Period saves/deletes refresh the Contract Periods tab and Project Economics data so Annual retainer consumption and balances reflect the latest backend state.

Work Item status display in Project Detail, global Work Items and Work Item Detail uses backend Work Item DTO fields (`StatusKey`, `StatusName`, `StatusTypology`, `CustomerDisplayName`, `IsClosed`) and does not reintroduce the old fixed Work Item status enum model. Work Item Detail loads a single work item through `WorkItem/GetWorkItem`.

The global Work Items page is API-backed through `WorkItem/GetWorkItems`. It uses backend filters for search text, project, customer, assignee, unassigned-only, status key, priority and include-closed behavior. Rows and mobile cards navigate to the API-backed Work Item Detail route. Admin users can create Work Items through `WorkItem/CreateWorkItem`; successful creates reload the list.

Work Item create/update/status-change are API-backed and Admin-only. The form loads projects from `Project/GetProjects`, active statuses from `StatusConfig/GetStatusConfigs`, and active employees from `Employee/GetActiveEmployees`. Status selection stores `StatusKey`; create can use the backend default initial status, while update sends the selected active status key. Assignee can be set to an active employee or left unassigned. Work Item Detail exposes Admin-only edit/status/assignment/project changes through `WorkItem/UpdateWorkItem` and reloads detail after save.

When a Work Item moves to another Project, the backend updates related `TimeEntry.ProjectId` rows for that WorkItem. Code, origin, external reference and opening date remain read-only on edit. Project Detail Work Items still has its create button disabled; create from Project Detail can be added later with project preselection.

## Time Entries API Integration

The global Add Time dialog is API-backed through `TimeEntry/CreateTimeEntry`. It loads active employees from `Employee/GetActiveEmployees` only for Admin users, uses the backend current employee for Employee users, searches Work Items through `WorkItem/GetWorkItems`, and sends only `EmployeeId`, `WorkItemId`, `Date`, `Time`, `Description` and `Notes`. The frontend does not send `ProjectId`, `ApprovedTime`, rates or snapshots; `TimeEntryService` derives `ProjectId` from `WorkItem.ProjectId`, defaults `ApprovedTime` to logged `Time`, captures employee/rate snapshots and owns overtime side effects.

The global Time Entries page is API-backed through `TimeEntry/GetTimeEntries` with backend filters for date range, employee, customer, project and status. Rows use backend display fields for employee, customer, project, Work Item code/title, notes, status and time. Employee users see only rows allowed by the backend. The service overrides non-admin employee filters with `WorkLogUserContext.EmployeeId`; clearing or spoofing `EmployeeId` in the request does not return other employees' rows.

TimeEntry update is connected through `TimeEntry/UpdateTimeEntry` from the global Time Entries page. The update form can change date, time, WorkItem and notes/description. If WorkItem changes, the backend updates `ProjectId` from the new WorkItem and refreshes the backend-owned project-rate snapshot.

ApprovedTime is edited only by Admin users and only through `TimeEntry/UpdateApprovedTime`. The Add Time dialog and normal TimeEntry edit never send ApprovedTime. For non-admin responses, backend TimeEntry DTO mapping returns null for ApprovedTime, AdminNote, employee level snapshot, employee default rate snapshot, project rate snapshot and calculated value; frontend hiding is not treated as authorization. Successful creates/updates dispatch a refresh event consumed by global Time Entries, Project Detail Time Entries/Economics and Work Item Detail.

## My Day API Integration

My Day is API-backed and uses the backend current user from `AuthContext`. It requires `currentUser.employeeId`; Employee users never fall back to mock employee identities. Admin users see their own linked employee profile if present and the page is not a broader admin completeness view.

For the selected date, My Day loads daily time rows through `TimeEntry/GetTimeEntries`, existing leave/permission requests through `LeaveRequest/GetLeaveRequests`, assigned priority Work Items through `WorkItem/GetWorkItems`, and the authoritative daily summary through `TimeCompleteness/GetTimeCompleteness`. `TimeCompletenessService` owns expected hours, worked hours, approved leave hours, missing hours and overtime status. The endpoint is authenticated and the service restricts non-admin users to their own employee id.

The Add Time button uses the global API-backed Add Time dialog. Successful TimeEntry creates refresh My Day through the shared time-entry saved event. My Day edit controls are intentionally disabled in this slice; normal TimeEntry edits remain available from the global Time Entries page.

Leave request creation from My Day is API-backed through `LeaveRequest/CreateLeaveRequest`. The form defaults to the selected My Day date and the current linked employee profile, accepts Vacation/Permission, positive 0.5-increment hours and an optional employee note, and reloads backend leave preview plus `TimeCompleteness/GetTimeCompleteness` after save. Approved leave hours shown in the summary still come from `TimeCompletenessService`, not frontend recalculation.

## Approvals API Integration

The Approvals page is API-backed for leave, permission and overtime requests. Admin users load leave requests through `LeaveRequest/GetLeaveRequests` with status, employee, date range and type filters, and approve/reject through `LeaveRequest/ApproveLeaveRequest` and `LeaveRequest/RejectLeaveRequest` with an optional admin note.

Overtime approvals load through `OvertimeRequest/GetOvertimeRequests` and `OvertimeRequest/GetOvertimeRequest`; the detail endpoint supplies same-day TimeEntries for review. Admin users approve/reject through `OvertimeRequest/ApproveOvertimeRequest` and `OvertimeRequest/RejectOvertimeRequest`, with optional approved-hours input on approve and optional admin note. Successful actions dispatch a shared overtime refresh event consumed by Time Completeness and My Day if mounted. The page does not use mock leave/overtime requests or fall back to mock data after API errors.

## Time Completeness API Integration

The Time Completeness page is API-backed through `TimeCompleteness/GetTimeCompleteness` and is an Admin-focused operational page. It uses backend filters for date range, employee and daily completeness status. The frontend renders backend DTO fields for expected daily hours, worked hours, approved leave hours, daily total, missing hours, overtime hours and status, and does not recompute authoritative completeness locally.

## Customer Reports API Integration

Customer Reports is API-backed and Admin-only. The page loads active customers through `Customer/GetCustomers`, loads optional project filter choices through `Project/SearchProjects` after a customer is selected, and posts the selected customer/date range/project filter to `Report/GetCustomerReport`.

`Report/GetCustomerReport` is the source of truth for total hours, approved hours and worked value. The frontend groups returned rows only for visual charts/tables and does not use mock TimeEntries, mock WorkItems or mock Projects as report data. CSV export is generated only from the currently loaded backend report rows. PDF generation and official export delivery remain pending.

Still pending:

- Work Item comments retrieval UI;
- Dashboard API integration;
- pagination for project list/search and Work Item list endpoints.
- Work Item origin filtering;
- Project Detail Add Work Item shortcut.

## Settings Status Model

Work Item statuses are freely configurable.

- `Key` is the stable readable unique kebab-case reference stored on Work Items as `StatusKey`.
- `Name` is the internal workflow status label and can be edited without changing existing Work Item references.
- `Typology` is the fixed business meaning: `New`, `InProgress`, `WaitingInternal`, `WaitingCustomer`, `Closed` or `Archived`.
- `CustomerDisplayName` is the customer-facing label and can hide internal statuses, for example Code review as In progress.
- Multiple statuses can share the same typology.
- Closed/open display is derived from typology. `Closed` and `Archived` are closed; the other typologies are open.
- The default initial status is the first active status ordered by `Order` where typology is `New`.
- `IsClosed` and `IsInitial` are not edited or stored in the Settings form.
- The Settings form allows editing `Key` only when creating a status. Existing statuses show `Key` as read-only.

Local/development databases can initialize the default status keys with `dotnet run --project SC.WorkLog.ConsoleTester -- EnsureDefaultStatuses`. This is an explicit admin/dev operation and is not run automatically by the WebApp.

## Settings Identity Model

There is no separate WorkLog Users page for now.

`WorkLogUser` remains the backend authorization/account model:

- Cognito authenticates identity.
- `WorkLogUser` owns application access, user type and role.
- `Employee` remains the operational/HR profile.
- `Customer` remains the customer company profile.

Employee application access is configured from the employee create/edit form:

- enabling login creates or updates an Employee-type `WorkLogUser`;
- role is `Employee` or `Admin`;
- `EmployeeId` is set to the saved employee id;
- email and display name follow the employee profile;
- disabling login deactivates the linked `WorkLogUser`.

Customer portal users are configured from the customer create/edit form:

- portal users create or update Customer-type `WorkLogUser` records;
- role is always `Customer`;
- `CustomerId` is set to the saved customer id;
- customer users can be modeled, but customer portal access remains disabled.

## Current Limitations

- Settings operations are not transactional. If Employee/Customer save succeeds and `WorkLogUser` save fails, the UI shows a warning and reloads the saved data.
- `WorkLogUser/GetUsers` supports server-side filters. Settings queries linked access records by `EmployeeId` or `CustomerId` instead of loading all WorkLog users. Pagination is still pending.
- Business pages outside Settings, Projects, Work Items, Time Entries, My Day, Approvals, Time Completeness and Customer Reports use mock or pending data. Work Item comments remain postponed until Jira/comment sync strategy is defined or abandoned. Dashboard remains pending.
- Customer portal pages and customer authorization rules are not implemented.
