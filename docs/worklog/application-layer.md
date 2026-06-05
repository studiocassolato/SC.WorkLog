# WorkLog Application Layer

This document describes the initial WorkLog application layer contracts.

## Purpose

The application layer defines service contracts, request models and read models for the WorkLog API surface. It uses the generic MongoDB repository abstraction through Application services, while controllers remain thin wrappers in `SC.WorkLog.WebApp`.

The frontend may keep lightweight validations for user experience, but backend services are the authoritative source for business rules, calculations, security-sensitive validations and data visibility. The Settings UI orchestrates Employee/Customer saves with related `WorkLogUser` saves, but those operations are not transactional yet.

## Service areas

Initial service classes are available under `SC.WorkLog.Application/Services`:

- `EmployeeService`
- `CustomerService`
- `ProjectService`
- `WorkItemService`
- `TimeEntryService`
- `LeaveRequestService`
- `OvertimeRequestService`
- `ProjectReportService`
- `TimeCompletenessService`

The initial data-loading and persistence methods are now implemented using the generic `IRepository<TEntity>` abstraction from the Domain layer. Services remain concrete classes and use manual mapping between Domain entities and DTOs.

No entity-specific repositories have been added.

## DTO and read model structure

Application DTOs are grouped directly under `SC.WorkLog.Application/DTO`:

- `Employees`: employee list/detail and create/update requests.
- `Customers`: customer list/detail and create/update requests.
- `Projects`: project list/detail, milestones, capabilities and summary read models.
- `WorkItems`: list/detail, filters, create/update requests and comment request DTOs.
- `TimeEntries`: list/detail, filters and create/update/approved-time requests.
- `Payments`: Time & material payment DTOs and requests.
- `ContractPeriods`: Annual retainer contract period DTOs and requests.
- `LeaveRequests`: leave request DTOs and approval/rejection requests.
- `OvertimeRequests`: overtime DTOs, filters and approval/rejection requests.
- `Reports`: project economics, customer report and time completeness read models.
- `WorkLogUsers`: application users for employee and future customer access.
- `StatusConfigs`: configurable Work Item statuses grouped by `WorkItemStatusTypology`.
- `Common`: application user context and role placeholders.

Admin-only values such as approved time, rates, employee level snapshots, economic amounts, calculated values and report totals are represented only in DTOs intended for admin-capable views or are returned as null/zero for non-admin mappings. Connected API endpoints must enforce server-side authorization and must not rely on frontend hiding or the frontend demo role switcher.

## Implemented validation

`WorkLogApplicationValidation` provides small, explicit guards for:

- required identifiers and strings;
- positive amounts and hours;
- 0.5 hour increments;
- valid date ranges;
- Admin-only operations;
- employee self-or-admin operations;
- Time & material-only project payments;
- Annual retainer-only contract periods.

This is intentionally not a full validation framework. Broader validation can be added incrementally as more endpoints and workflows are connected.

## Implemented Service Behavior

The current services now enforce and orchestrate the initial backend-owned rules:

- `EmployeeService`: list, active list, detail, create, update and email uniqueness lookup.
- `CustomerService`: list, search, detail, create and update.
- `ProjectService`: list/search, detail composition, create/update, capabilities, milestones, payments, contract periods and overlap prevention.
- `WorkItemService`: list/filter, detail, Admin-only create/update and comment creation using the server-side current employee as author.
- `StatusConfigService`: configurable Work Item statuses, default status provisioning by stable key, unique keys/names, active New/closed invariants and computed closed/open behavior.
- `TimeEntryService`: list/filter, create/update, approved-time update, backend snapshots, denormalized `ProjectId` consistency and overtime request creation/update.
- `LeaveRequestService`: list/filter, create, approve and reject, with employee self-scoping for non-admin reads, self-or-admin creation checks, active employee validation, positive 0.5-increment hours and Admin-only approval/rejection.
- `OvertimeRequestService`: Admin-only list/filter, detail, approve and reject with day time entries for review.
- `ProjectReportService`: repository-backed project/customer reports and economics orchestration through domain calculators. Customer reports require Admin, `CustomerId` and a valid date range, load only non-internal projects for the selected customer and use `TimeEntry.ProjectId` plus `ApprovedTime` for reportable approved totals/value.
- `TimeCompletenessService`: repository-backed date range completeness using active employees, time entries, approved leave and overtime requests. Pending and rejected leave requests do not contribute to leave hours.
- `WorkLogUserService`: repository-backed application user management and authenticated user resolution. The frontend uses these endpoints behind Settings Employees/Customers rather than exposing a separate Users page.
- `JiraImportService`: local ConsoleTester-only Jira/Tempo import orchestration. It consumes read-only Infrastructure clients, maps source models into `WorkItem` and `TimeEntry` aggregates, enforces customer/default-project and employee mapping rules, and records `ExternalImportSyncState`.

Economic data, approved time updates, customer reports, user management, overtime administration and work item create/update require Admin role checks at the application layer. Time completeness can be consumed by employee-facing My Day, but `TimeCompletenessService` scopes non-admin users to `WorkLogUserContext.EmployeeId`.

The frontend Projects list and base Project Detail consume `ProjectService` read models. Admin Project create/update now calls `ProjectService.CreateProjectAsync` and `ProjectService.UpdateProjectAsync` for customer, name, payment type, status, default-project flag, notes and base payment-type fields. `ProjectService` enforces that each customer can have at most one default project. Project Detail Economics consumes `ProjectReportService.GetProjectEconomicsAsync` through `Project/GetProjectEconomics`; the frontend formats returned values but does not recompute authoritative economics. Customer Reports consumes `ProjectReportService.GetCustomerReportAsync` through `Report/GetCustomerReport`; the frontend loads customers/projects for filters and treats backend report totals as authoritative. Project Payments consumes `ProjectService.GetProjectPaymentsAsync`, `CreateProjectPaymentAsync`, `UpdateProjectPaymentAsync` and `DeleteProjectPaymentAsync` through the Project payment endpoints for Time & material projects only. Project Contract Periods consumes `ProjectService.GetProjectContractPeriodsAsync`, `CreateProjectContractPeriodAsync`, `UpdateProjectContractPeriodAsync` and `DeleteProjectContractPeriodAsync` through the Project contract period endpoints for Annual retainer projects only. Project Milestones consume `ProjectService` create/update/delete milestone methods and require selected-project ownership for update/delete. The Project Detail Work Items tab and global Work Items page consume `WorkItemService.GetWorkItemsAsync` through `WorkItem/GetWorkItems`; the global page uses backend filters for search text, project, customer, assignee, unassigned-only, status key, priority and include-closed behavior. Project Detail Time Entries, global Time Entries and My Day consume `TimeEntryService.GetTimeEntriesAsync` through `TimeEntry/GetTimeEntries` with ProjectId/date/employee/customer/status filtering as applicable. Add Time uses `TimeEntryService.CreateTimeEntryAsync` through `TimeEntry/CreateTimeEntry`; TimeEntry row edits use `TimeEntryService.UpdateTimeEntryAsync` through `TimeEntry/UpdateTimeEntry`; Admin ApprovedTime edits use `TimeEntryService.UpdateApprovedTimeAsync` through `TimeEntry/UpdateApprovedTime`. My Day uses `LeaveRequestService.GetLeaveRequestsAsync` for selected-date leave previews, `LeaveRequestService.CreateLeaveRequestAsync` for employee leave/permission creation, and `TimeCompletenessService.GetTimeCompletenessAsync` for backend-owned expected/worked/approved-leave/missing/overtime summary. Approvals uses `LeaveRequestService.GetLeaveRequestsAsync`, `ApproveLeaveRequestAsync`, `RejectLeaveRequestAsync`, `OvertimeRequestService.GetOvertimeRequestsAsync`, `GetOvertimeRequestDetailAsync`, `ApproveOvertimeRequestAsync` and `RejectOvertimeRequestAsync` for Admin approval workflows. Time Completeness uses `TimeCompletenessService.GetTimeCompletenessAsync` and does not recompute authoritative daily totals in the frontend. Work Item Detail consumes `WorkItemService.GetWorkItemDetailAsync` through `WorkItem/GetWorkItem`. Admin Work Item create/update/status-change uses `WorkItemService.CreateWorkItemAsync` and `WorkItemService.UpdateWorkItemAsync` through `WorkItem/CreateWorkItem` and `WorkItem/UpdateWorkItem`. Status changes are represented by updating `StatusKey`; assignee changes can set an active employee or null; project changes are allowed for Admin users.

Work item comments do not accept a frontend-owned author id. `AddComment` uses `WorkLogUserContext.EmployeeId`, validates the linked active employee, validates the target work item and requires comment content.

Jira/Tempo import is local-only in this phase. External HTTP clients and source models live in Infrastructure; Application owns mapping, idempotency, sync-state updates and persistence. Jira issues are matched by `WorkItem.Code` or `WorkItem.Jira.IssueId`; Tempo/Jira worklogs are matched by imported worklog ids with a composite fallback. Dry-run mode reports create/update/skip counts without writing WorkItems, TimeEntries or sync state.

Work Item statuses are represented by `StatusConfig` records. `StatusConfig.Id` is only the technical aggregate id. `StatusConfig.Key` is the stable readable unique kebab-case reference stored on `WorkItem.StatusKey`; it is read-only after creation. `StatusConfig.Name` is a free editable internal workflow label, while `StatusConfig.Typology` is the fixed business meaning (`New`, `InProgress`, `WaitingInternal`, `WaitingCustomer`, `Closed`, `Archived`). Multiple statuses can share the same typology, and `CustomerDisplayName` can hide internal states from customer-facing surfaces. `IsClosed` and `IsInitial` are not stored or edited: closed/open behavior is derived from typology, and the initial/default status is the first active `New` status ordered by `Order`.

Default Work Item statuses are initialized through an explicit ConsoleTester command, `EnsureDefaultStatuses`. The command delegates to `StatusConfigService`, matches defaults by `Key`, creates missing default keys, does not overwrite customized existing status records and validates active `New` plus active closed typology invariants.

`TimeEntry` stores both `WorkItemId` and a denormalized `ProjectId`. `WorkItemId` remains the main functional relation to the ticket/activity, while `ProjectId` is owned by the backend and copied from `WorkItem.ProjectId` when time is created. `CreateTimeEntryRequest` and `UpdateTimeEntryRequest` do not accept `ProjectId`, `ApprovedTime`, rates or snapshots from the frontend. `UpdateTimeEntryRequest` may carry a new `WorkItemId`; when it changes, `TimeEntryService.UpdateTimeEntryAsync` loads the new WorkItem/Project, updates backend-owned `ProjectId`, and refreshes the project-rate snapshot from the current project and stored employee level snapshot. `TimeEntryService.UpdateApprovedTimeAsync` is the only ApprovedTime write path and requires Admin. `TimeEntryService.GetTimeEntriesAsync` scopes non-admin users to `WorkLogUserContext.EmployeeId` even when the request omits or spoofs `EmployeeId`. Non-admin TimeEntry DTOs return null for ApprovedTime, AdminNote, employee level snapshot, employee default rate snapshot, project rate snapshot and calculated value. If an updated legacy time entry has an inconsistent `ProjectId`, update resynchronizes it from the current WorkItem. `WorkItemService.UpdateWorkItemAsync` supports moving a WorkItem to another Project and bulk-updates all related `TimeEntry.ProjectId` records after saving the WorkItem. There is no Unit of Work yet, so this multi-document update should later be protected by a MongoDB transaction or a compensating repair task.

## Calculation orchestration

The application layer does not duplicate domain calculation logic.

`ProjectReportService` loads project economics and customer report time rows by `TimeEntry.ProjectId` where possible, then keeps `WorkItemId` for Work Item-specific labels and rows. It maps domain calculator results into application DTOs for:

- Time & material economics;
- Fixed price economics;
- Annual retainer economics;
- Internal project economics.

`TimeCompletenessService` maps daily completeness calculator results into read models and can compose a date range when supplied with already-loaded domain entities.

## Repository Query Strategy

Application services use the generic `IRepository<TEntity>` predicate support to load scoped data for list, detail and report operations.

Large collections such as `TimeEntry`, `WorkItem`, `ProjectPayment`, `ProjectContractPeriod`, `LeaveRequest`, `OvertimeRequest` and `WorkItemComment` should not be read with full collection scans for normal list/detail/report flows. Services should first identify relevant ids, then query by those ids or by date/status filters. Project/report/economics time-entry queries should prefer denormalized `TimeEntry.ProjectId`; Work Item-specific views should continue using `WorkItemId`.

Mapping methods should stay pure and must not perform repository calls. Data-loading/composition methods should load the needed entities in batches, build dictionaries or groupings, and then call pure mapping helpers.

Domain calculators receive already-scoped domain entities from application services. They do not perform persistence access.

## Pending work

The following items are intentionally pending:

- customer portal enablement and customer-specific authorization;
- project/customer visibility checks backed by persisted user permissions;
- official export/report delivery mechanisms; Customer Reports currently has client-side CSV from already-loaded backend rows only, and no PDF generation.
- incremental replacement of remaining frontend mock pages: Dashboard.
- Work Item comments retrieval UI.
- transaction handling or compensating workflow for multi-step Settings saves.
- pagination for WorkLogUser admin queries.
- optional minimal company profile/report branding if product flow needs it later.

Remaining mock-only frontend pages can keep duplicated UX validation only as a convenience. Real API endpoints must call these backend services and enforce authorization server-side.
