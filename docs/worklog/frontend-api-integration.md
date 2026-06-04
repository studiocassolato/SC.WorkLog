# WorkLog Frontend API Integration

This document tracks frontend areas that are backed by the WorkLog API.

## Current API-Backed Areas

- Authentication shell and current-user resolution use `/api/Auth/Me`.
- Projects list, base Project Detail, Project create/update, Project Detail Economics, Project Payments, Project Contract Periods, Project Milestones, Project Detail Work Items tab and Work Item Detail read-only are API-backed through `Project/GetProjects`, `Project/SearchProjects`, `Project/GetProject`, `Project/CreateProject`, `Project/UpdateProject`, `Project/GetProjectEconomics`, `Project/GetProjectPayments`, `Project/CreateProjectPayment`, `Project/UpdateProjectPayment`, `Project/DeleteProjectPayment`, `Project/GetProjectContractPeriods`, `Project/CreateProjectContractPeriod`, `Project/UpdateProjectContractPeriod`, `Project/DeleteProjectContractPeriod`, `Project/CreateMilestone`, `Project/UpdateMilestone`, `Project/DeleteMilestone`, `WorkItem/GetWorkItems` and `WorkItem/GetWorkItem`.
- Settings includes only Statuses, Customers and Employees.
- Settings Statuses uses `StatusConfig` API endpoints for configurable Work Item workflow statuses.
- Settings Employees uses `Employee` API endpoints for operational/HR employee data.
- Settings Customers uses `Customer` API endpoints for customer company data.
- Settings manages `WorkLogUser` records behind the Employees and Customers screens.

The Company Settings tab is not part of the current scope. Expected daily hours are employee-level data, and leave/permission/overtime approvals are handled by admin approval flows. A minimal company profile for report/PDF branding can be added later if needed.

## Projects API Integration

Projects list uses backend `ProjectListItemDto` data for project name, customer name, payment type, status, logged hours, work item count and open work item count. Search, status and payment-type filters call `Project/SearchProjects`; the unfiltered view calls `Project/GetProjects`.

Admin users can create and update base Project fields through `Project/CreateProject` and `Project/UpdateProject`. The form uses backend current-user authorization, loads customers from `Customer/GetCustomers`, prefers active customers in the selector, and supports customer, project name, payment type, status and notes.

Payment-type-specific project fields:

- Time & material: junior, mid and senior rates.
- Fixed price: fixed amount.
- Annual retainer: no project-level annual amount; retainer amounts remain managed by Contract Periods.
- Internal: no economic setup required.

Project Detail uses `Project/GetProject` for base project information, customer info, notes, milestones, hours summary, work item summary and team summary. Admin users can create, update and delete milestones through `Project/CreateMilestone`, `Project/UpdateMilestone` and `Project/DeleteMilestone`; successful writes reload Project Detail. The Project Detail Work Items tab uses `WorkItem/GetWorkItems` with `projectId` and `includeClosed=true`, so it does not load all Work Items and filter client-side. Work Item rows/cards navigate to the API-backed Work Item Detail route.

Project Detail Economics uses `Project/GetProjectEconomics` and no longer performs mock calculations from frontend WorkItems or TimeEntries. The backend response is the source of truth for Time & material, Fixed price, Annual retainer and Internal project economics. Annual retainer amounts come from Contract Periods; if no contract period exists, the UI shows a clear empty state rather than falling back to legacy mock `annualAmount` fields.

Project Payments are API-backed for Time & material projects. Admin users can list, create, update and delete payments through `Project/GetProjectPayments`, `Project/CreateProjectPayment`, `Project/UpdateProjectPayment` and `Project/DeleteProjectPayment`. Payment saves/deletes refresh the Payments tab and Project Economics data so Time & material balances reflect the latest backend state.

Project Contract Periods are API-backed for Annual retainer projects. Admin users can list, create, update and delete periods through `Project/GetProjectContractPeriods`, `Project/CreateProjectContractPeriod`, `Project/UpdateProjectContractPeriod` and `Project/DeleteProjectContractPeriod`. Period saves/deletes refresh the Contract Periods tab and Project Economics data so Annual retainer consumption and balances reflect the latest backend state.

Work Item status display in Project Detail and Work Item Detail uses backend Work Item DTO fields (`StatusKey`, `StatusName`, `StatusTypology`, `CustomerDisplayName`, `IsClosed`) and does not reintroduce the old fixed Work Item status enum model. Work Item Detail is read-only and loads a single work item through `WorkItem/GetWorkItem`; comments, create/update and status-change flows remain pending.

Still pending:

- global Work Items page API integration;
- Work Item create/update/status-change API integration;
- Work Item comments retrieval UI;
- project time entry row integration;
- pagination for project list/search endpoints.

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
- Business pages outside Settings and Projects still use mock data. The global Work Items page remains mock-only even though Project Detail Work Items are API-backed.
- Customer portal pages and customer authorization rules are not implemented.
