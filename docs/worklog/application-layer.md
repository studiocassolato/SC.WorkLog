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

Admin-only values such as approved time, rates, economic amounts, calculated values and report totals are represented only in DTOs intended for admin-capable views. Connected API endpoints must enforce server-side authorization and must not rely on the frontend demo role switcher.

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
- `TimeEntryService`: list/filter, create/update, approved-time update, backend snapshots and overtime request creation/update.
- `LeaveRequestService`: list/filter, create, approve and reject.
- `OvertimeRequestService`: list/filter, detail, approve and reject with day time entries for review.
- `ProjectReportService`: repository-backed project/customer reports and economics orchestration through domain calculators.
- `TimeCompletenessService`: repository-backed date range completeness using active employees, time entries, approved leave and overtime requests.
- `WorkLogUserService`: repository-backed application user management and authenticated user resolution. The frontend uses these endpoints behind Settings Employees/Customers rather than exposing a separate Users page.

Economic data, approved time updates, customer reports, user management, overtime administration and work item create/update require Admin role checks at the application layer.

The frontend Projects list and base Project Detail consume `ProjectService` read models. Admin Project create/update now calls `ProjectService.CreateProjectAsync` and `ProjectService.UpdateProjectAsync` for customer, name, payment type, status, notes and base payment-type fields. Project Detail Economics consumes `ProjectReportService.GetProjectEconomicsAsync` through `Project/GetProjectEconomics`; the frontend formats returned values but does not recompute authoritative economics. Project Payments consumes `ProjectService.GetProjectPaymentsAsync`, `CreateProjectPaymentAsync`, `UpdateProjectPaymentAsync` and `DeleteProjectPaymentAsync` through the Project payment endpoints for Time & material projects only. Project Contract Periods consumes `ProjectService.GetProjectContractPeriodsAsync`, `CreateProjectContractPeriodAsync`, `UpdateProjectContractPeriodAsync` and `DeleteProjectContractPeriodAsync` through the Project contract period endpoints for Annual retainer projects only. Project Milestones consume `ProjectService` create/update/delete milestone methods and require selected-project ownership for update/delete. The Project Detail Work Items tab consumes `WorkItemService.GetWorkItemsAsync` through `WorkItem/GetWorkItems` filtered by `ProjectId`, and Work Item Detail consumes `WorkItemService.GetWorkItemDetailAsync` through `WorkItem/GetWorkItem` in read-only mode. Work Item create/update/status-change, comments retrieval UI and time entry rows remain separate integration work.

Work item comments do not accept a frontend-owned author id. `AddComment` uses `WorkLogUserContext.EmployeeId`, validates the linked active employee, validates the target work item and requires comment content.

Work Item statuses are represented by `StatusConfig` records. `StatusConfig.Id` is only the technical aggregate id. `StatusConfig.Key` is the stable readable unique kebab-case reference stored on `WorkItem.StatusKey`; it is read-only after creation. `StatusConfig.Name` is a free editable internal workflow label, while `StatusConfig.Typology` is the fixed business meaning (`New`, `InProgress`, `WaitingInternal`, `WaitingCustomer`, `Closed`, `Archived`). Multiple statuses can share the same typology, and `CustomerDisplayName` can hide internal states from customer-facing surfaces. `IsClosed` and `IsInitial` are not stored or edited: closed/open behavior is derived from typology, and the initial/default status is the first active `New` status ordered by `Order`.

Default Work Item statuses are initialized through an explicit ConsoleTester command, `EnsureDefaultStatuses`. The command delegates to `StatusConfigService`, matches defaults by `Key`, creates missing default keys, does not overwrite customized existing status records and validates active `New` plus active closed typology invariants.

## Calculation orchestration

The application layer does not duplicate domain calculation logic.

`ProjectReportService` maps domain calculator results into application DTOs for:

- Time & material economics;
- Fixed price economics;
- Annual retainer economics;
- Internal project economics.

`TimeCompletenessService` maps daily completeness calculator results into read models and can compose a date range when supplied with already-loaded domain entities.

## Repository Query Strategy

Application services use the generic `IRepository<TEntity>` predicate support to load scoped data for list, detail and report operations.

Large collections such as `TimeEntry`, `WorkItem`, `ProjectPayment`, `ProjectContractPeriod`, `LeaveRequest`, `OvertimeRequest` and `WorkItemComment` should not be read with full collection scans for normal list/detail/report flows. Services should first identify relevant ids, then query by those ids or by date/status filters.

Mapping methods should stay pure and must not perform repository calls. Data-loading/composition methods should load the needed entities in batches, build dictionaries or groupings, and then call pure mapping helpers.

Domain calculators receive already-scoped domain entities from application services. They do not perform persistence access.

## Pending work

The following items are intentionally pending:

- customer portal enablement and customer-specific authorization;
- project/customer visibility checks backed by persisted user permissions;
- final overtime/completeness workflow side effects after leave changes;
- export/report delivery mechanisms;
- incremental replacement of remaining frontend mock pages: Dashboard, global Work Items, Time Entries, My Day, Approvals, Reports and Time Completeness.
- Work Item write flows and comments retrieval UI.
- transaction handling or compensating workflow for multi-step Settings saves.
- pagination for WorkLogUser admin queries.
- optional minimal company profile/report branding if product flow needs it later.

Remaining mock-only frontend pages can keep duplicated UX validation only as a convenience. Real API endpoints must call these backend services and enforce authorization server-side.
