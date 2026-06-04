# WorkLog Frontend Mock Model

## 1. Purpose

The current WorkLog frontend is a Vite/React mock application imported from the v0 prototype and stabilized inside `SC.WorkLog.WebApp/client-app`.

Most business page data is still local mock data from `src/lib/mock-data.ts`. Runtime state and create/update actions for those mock-only pages are kept only in React state through `src/lib/worklog-context.tsx`.

Cognito authentication and backend current-user resolution are now implemented for the application shell. The frontend calls `/api/Auth/Me` after login and uses the backend `WorkLogUser` role/profile for route and navigation visibility. Settings Statuses, Employees and Customers are API-backed. Projects list, base Project Detail, Project create/update, Project Detail Economics, Project Payments, Project Contract Periods, Project Milestones, the Project Detail Work Items tab, Project Detail Time Entries tab, global Work Items, Work Item Detail create/update/status-change, Add Time, global Time Entries, My Day, Approvals and Time Completeness are API-backed. Dashboard and reports remain mock-only until later API integration phases.

Settings currently includes Statuses, Customers and Employees. Company Settings is removed from the current WorkLog scope; expected daily hours are stored per Employee, and leave/permission/overtime approvals are handled by admin workflows.

Settings Statuses is API-backed. Mock-only pages still use local mock WorkItem rows, but their mock `StatusConfig` shape mirrors the backend: stable key, free status name, fixed typology, customer display name, active flag and order. Mock Work Items store `statusKey`, not the editable status name. Closed/open behavior is derived from typology, and the default initial status is the first active `New` typology by order.

This document describes the model and UI behavior that exists today in the frontend. It is intended as a reference for future backend, API, persistence, and security implementation.

## 2. Main frontend entities

### Employee

| Field | Type | Meaning | Important notes |
| --- | --- | --- | --- |
| `id` | `string` | Employee identifier. | Mock ids use values like `emp-1`. |
| `firstName` | `string` | Employee first name. | Used in UI labels and user menu. |
| `lastName` | `string` | Employee last name. | Used with `firstName` for display. |
| `email` | `string` | Employee email address. | Used in user menu and settings. |
| `level` | `EmployeeLevel` | Seniority level. | Drives default and project rate snapshots. |
| `defaultHourlyRate` | `number` | Internal default hourly cost/rate. | Used for internal value calculations. Admin-only economic information. |
| `expectedDailyHours` | `number` | Expected working hours per day. | Used by time completeness and overtime checks. |
| `active` | `boolean` | Whether the employee is active. | Used by settings and selections. |

### Customer

| Field | Type | Meaning | Important notes |
| --- | --- | --- | --- |
| `id` | `string` | Customer identifier. | Referenced by `Project.customerId`. |
| `companyName` | `string` | Customer company name. | Main customer display value. |
| `companyDomain` | `string?` | Customer domain for future login. | Mock placeholder for future customer/auth scenarios. |
| `contactPerson` | `string` | Main contact name. | Editable in Settings. |
| `contactEmail` | `string` | Main contact email. | Editable in Settings. |
| `contactPhone` | `string?` | Main contact phone. | Optional. |
| `active` | `boolean` | Whether the customer is active. | Used by Settings and project creation filters. |

### Project

| Field | Type | Meaning | Important notes |
| --- | --- | --- | --- |
| `id` | `string` | Project identifier. | Referenced by `WorkItem.projectId`, `ProjectPayment.projectId`, and `ProjectContractPeriod.projectId`. |
| `customerId` | `string` | Owning customer id. | Links project to a customer. |
| `name` | `string` | Project name. | Main project display value. |
| `paymentType` | `PaymentType` | Billing/economic model. | Controls Project Detail economics and visible tabs. |
| `status` | `ProjectStatus` | Project lifecycle status. | UI uses `Active`, `Suspended`, `Closed`. |
| `notes` | `string` | Free text project notes. | Editable in Project Detail/Settings-like UI. |
| `active` | `boolean?` | Optional active flag. | Some mock usage relies mainly on `status`. |
| `juniorRate` | `number?` | Project billing rate for Junior. | Time & material only. |
| `midRate` | `number?` | Project billing rate for Mid. | Time & material only. |
| `seniorRate` | `number?` | Project billing rate for Senior. | Time & material only. |
| `fixedAmount` | `number?` | Contract amount for fixed price. | Fixed price only. |
| `annualAmount` | `number?` | Legacy/summary annual amount. | Annual retainer amounts are modeled through `ProjectContractPeriod`. |
| `milestones` | `ProjectMilestone[]` | Project milestones. | Shown in Project Detail. |
| `createdAt` | `string?` | Project creation date. | Optional mock field. |

Projects list, base Project Detail, Project create/update, Project Detail Economics, Project Payments, Project Contract Periods, Project Milestones, Project Detail Time Entries, Add Time, global Time Entries and My Day no longer use this mock Project model directly. Mock Project records remain in place because Dashboard, reports and other mock-only pages still reference them.

### ProjectMilestone

| Field | Type | Meaning | Important notes |
| --- | --- | --- | --- |
| `id` | `string` | Milestone identifier. | Nested in `Project.milestones`. |
| `projectId` | `string` | Owning project id. | Links milestone to project. |
| `title` | `string` | Milestone title. | Shown in Project Detail. |
| `date` | `string` | Milestone date. | Stored as string date. |

For API-backed Project Detail, milestones are loaded from `Project/GetProject` and Admin users can create, update and delete them through backend Project milestone endpoints. Mock milestones remain for mock-only pages that still read local Project records.

### WorkItem

| Field | Type | Meaning | Important notes |
| --- | --- | --- | --- |
| `id` | `string` | Work item identifier. | Referenced by `TimeEntry.workItemId` and `WorkItemComment.workItemId`. |
| `code` | `string?` | Optional work item code. | Used in lists/search when present. |
| `projectId` | `string` | Owning project id. | Links work item to project. |
| `title` | `string` | Work item title. | Main display value. |
| `description` | `string` | Work item details. | Shown in detail pages/dialogs. |
| `statusKey` | `WorkItemStatus` | Stable readable status key. | References `StatusConfig.key`; display names are resolved from status config. Backend API uses `StatusKey` as the persisted reference. |
| `priority` | `WorkItemPriority` | Priority level. | Rendered through priority badges. |
| `assigneeId` | `string \| null` | Assigned employee id. | `null` means unassigned. |
| `origin` | `'Manual' \| 'Jira' \| 'Azure DevOps' \| 'Email'` | Source of the work item. | New UI-created work items use `Manual`. |
| `externalReference` | `string \| null` | External system reference. | Used for Jira/Azure DevOps/email references when present. |
| `openingDate` | `string` | Opening date. | Stored as string date. |
| `closingDate` | `string \| null` | Closing date. | `null` means not closed by date. |
| `isPriority` | `boolean?` | Priority marker for assignee. | Optional extra flag. |

The Project Detail Work Items tab, global Work Items page, Work Item Detail route, Add Time dialog, global Time Entries page and My Day no longer use this mock WorkItem model. Project Detail reads backend Work Item DTOs filtered by `ProjectId`, global Work Items, My Day and Add Time read backend Work Item DTOs through `WorkItem/GetWorkItems`, and Work Item Detail reads one backend Work Item DTO by id through `WorkItem/GetWorkItem`. Admin create/update/status-change uses backend `WorkItem/CreateWorkItem` and `WorkItem/UpdateWorkItem`, with `StatusKey` selected from active `StatusConfig` records and assignees selected from active Employees. Mock WorkItems remain for Dashboard, reports and other mock-only pages.

### TimeEntry

| Field | Type | Meaning | Important notes |
| --- | --- | --- | --- |
| `id` | `string` | Time entry identifier. | Mock ids use `te-*`. |
| `employeeId` | `string` | Employee who entered time. | Admin can enter for another employee in the Add Time dialog. |
| `workItemId` | `string` | Linked work item id. | Required by the Add Time dialog. |
| `projectId` | `string?` | Denormalized owning project id in the backend model. | Backend-owned copy of `WorkItem.projectId` for project/report queries. Frontend create/update requests submit `workItemId`, not authoritative `projectId`. Mock TimeEntry rows may still derive project through WorkItem for Dashboard, reports and other mock-only pages. |
| `date` | `string` | Entry date. | Used for reports, completeness, and contract period assignment. |
| `time` | `number` | Hours logged by employee. | Entered in 0.5 hour increments in the UI. |
| `approvedTime` | `number` | Hours approved by admin. | Used for economics and admin views. Hidden from Employee views. |
| `description` | `string` | Description of work done. | Shown in time lists and reports. |
| `notes` | `string?` | Optional extra notes. | Optional. |
| `status` | `RequestStatus?` | Optional approval-like status. | Not consistently required by all time entry UI. |
| `adminNote` | `string \| null` | Admin note. | Placeholder for review/approval scenarios. |
| `employeeLevelSnapshot` | `EmployeeLevel` | Employee level at entry time. | Snapshot avoids recalculating with later level changes. |
| `defaultRateSnapshot` | `number` | Internal/default rate at entry time. | Used for internal value calculations. |
| `projectRateSnapshot` | `number` | Project billing rate at entry time. | Used for Time & material worked value. |

### ProjectPayment

| Field | Type | Meaning | Important notes |
| --- | --- | --- | --- |
| `id` | `string` | Payment identifier. | Mock payment record. |
| `projectId` | `string` | Project receiving the payment. | Used by Time & material projects. |
| `paymentDate` | `string` | Payment date. | Used in history and monthly balance. |
| `amount` | `number` | Payment amount. | Summed into total payments received. |
| `note` | `string` | Payment note. | Displayed in payment history. |
| `createdOn` | `string` | Creation timestamp/date. | Mock audit field. |
| `createdBy` | `string` | Creator employee id/name. | Mock audit field. |

### ProjectContractPeriod

| Field | Type | Meaning | Important notes |
| --- | --- | --- | --- |
| `id` | `string` | Contract period identifier. | Used by Annual retainer projects. |
| `projectId` | `string` | Owning project id. | One project can have multiple periods. |
| `startDate` | `string` | Period start date. | Time entries are assigned by `TimeEntry.date`. |
| `endDate` | `string` | Period end date. | Inclusive interval in the current frontend calculations. |
| `amount` | `number` | Contract amount for the period. | Used for period balance and consumption. |
| `paymentDate` | `string?` | Optional payment date. | Optional. |
| `note` | `string` | Period note. | Displayed in Contract Periods tab. |
| `createdOn` | `string` | Creation timestamp/date. | Mock audit field. |
| `createdBy` | `string` | Creator employee id/name. | Mock audit field. |

For API-backed Project Detail, the Contract Periods tab now reads, creates, updates and deletes periods through backend Project contract period endpoints for Annual retainer projects. These mock contract period records remain for Dashboard, reports and other mock-only pages.

### LeaveRequest

| Field | Type | Meaning | Important notes |
| --- | --- | --- | --- |
| `id` | `string` | Leave request identifier. | Mock ids use `lr-*`. |
| `employeeId` | `string` | Requesting employee. | Links request to an employee. |
| `type` | `LeaveType` | Leave request type. | `Vacation` or `Permission`. |
| `date` | `string` | Leave date. | Used in daily completeness. |
| `hours` | `number` | Requested hours. | Vacation and permission are hour-based. |
| `status` | `RequestStatus` | Approval status. | Pending, approved, or rejected. |
| `requestDate` | `string` | Date the request was created. | Mock audit field. |
| `employeeNote` | `string` | Employee request note. | Submitted from the API-backed My Day leave request form. |
| `adminNote` | `string \| null` | Admin response note. | Set through the API-backed leave approval dialog. |

My Day creates leave requests through `LeaveRequest/CreateLeaveRequest`, lists selected-day requests through `LeaveRequest/GetLeaveRequests`, and reloads `TimeCompleteness/GetTimeCompleteness` after saves. Approvals uses backend leave and overtime requests plus approve/reject endpoints. Mock leave request records remain because Dashboard, Reports and other still-mock pages may reference them.

### OvertimeRequest

| Field | Type | Meaning | Important notes |
| --- | --- | --- | --- |
| `id` | `string` | Overtime request identifier. | Mock ids use `ot-*`. |
| `employeeId` | `string` | Employee with overtime. | Linked to employee and date. |
| `date` | `string` | Overtime date. | One pending request is maintained per employee/date in the mock context. |
| `calculatedHours` | `number` | Calculated overtime hours. | Created/updated when logged time exceeds expected daily hours. |
| `approvedHours` | `number` | Approved overtime hours. | Set to calculated hours when approved. |
| `status` | `RequestStatus` | Approval status. | Pending, approved, or rejected. |

### WorkItemComment

| Field | Type | Meaning | Important notes |
| --- | --- | --- | --- |
| `id` | `string` | Comment identifier. | Mock ids use `wic-*`. |
| `workItemId` | `string` | Related work item. | Links comment to work item. |
| `employeeId` | `string` | Comment author. | Links comment to employee. |
| `content` | `string` | Comment text. | Used by mock comment flows; API-backed Work Item Detail does not load comments yet. |
| `isInternal` | `boolean` | Whether comment is internal. | Internal comments receive distinct styling. |
| `createdAt` | `string` | Comment timestamp. | Used by mock comment flows; comments retrieval UI remains pending for API-backed Work Item Detail. |

### StatusConfig

| Field | Type | Meaning | Important notes |
| --- | --- | --- | --- |
| `id` | `string` | Status config identifier. | Mock ids use `status-*`. |
| `key` | `WorkItemStatus` | Stable readable status key. | Unique lowercase kebab-case value such as `code-review`; read-only after creation. |
| `name` | `WorkItemStatus` | Free internal work item status name. | Multiple names can share the same typology. |
| `typology` | `WorkItemStatusTypology` | Fixed business meaning. | Drives open/closed and waiting behavior. |
| `customerDisplayName` | `string` | Customer-facing label. | Example: `Code review` can be displayed as `In progress`. |
| `active` | `boolean` | Whether the status can be selected. | Use inactive instead of delete in this phase. |
| `order` | `number` | Display/order index. | Used for ordered status presentation. |

## 3. Enums / fixed values

### Employee levels

- `Junior`
- `Mid`
- `Senior`

### Project payment types

- `Time & material`
- `Fixed price`
- `Annual retainer`
- `Internal`

### Project statuses

- `Active`
- `Suspended`
- `Closed`

### Work item status typologies

- `New`
- `InProgress`
- `WaitingInternal`
- `WaitingCustomer`
- `Closed`
- `Archived`

Work item status names are configurable. The current default keys are `new`, `in-progress`, `code-review`, `under-analysis`, `waiting-for-customer`, `closed` and `happy-customer`; their current default names are `New`, `In progress`, `Code review`, `Under analysis`, `Waiting for customer`, `Closed` and `Happy customer`.

### Work item priorities

- `Low`
- `Normal`
- `High`
- `Urgent`

### Work item origins

- `Manual`
- `Jira`
- `Azure DevOps`
- `Email`

### Approval statuses

- `Pending approval`
- `Approved`
- `Rejected`

### Leave request types

- `Vacation`
- `Permission`

## 4. Important relationships

- A `Project` belongs to a `Customer` through `Project.customerId`.
- A `WorkItem` belongs to a `Project` through `WorkItem.projectId`.
- A `TimeEntry` belongs to a `WorkItem` through `TimeEntry.workItemId`.
- In the backend model, a `TimeEntry` also stores denormalized `projectId` copied from `WorkItem.projectId` for faster project/report queries. The backend owns consistency; frontend requests should not provide authoritative `projectId`.
- A `ProjectPayment` belongs to a `Project` through `ProjectPayment.projectId`.
- A `ProjectContractPeriod` belongs to a `Project` through `ProjectContractPeriod.projectId`.
- A `LeaveRequest` belongs to an `Employee` through `LeaveRequest.employeeId`.
- An `OvertimeRequest` belongs to an `Employee` and date through `OvertimeRequest.employeeId` and `OvertimeRequest.date`.
- A `WorkItemComment` belongs to a `WorkItem` and an `Employee` through `WorkItemComment.workItemId` and `WorkItemComment.employeeId`.

## 5. Project payment types and economics

On API-backed Project Detail, economics, payments and contract periods use backend DTOs from `Project/GetProjectEconomics` and the Project payment/contract-period endpoints. The mock formulas in this section describe Dashboard, reports and other mock-only pages that still use `mock-data.ts`.

### Time & material

Time & material projects use project-specific rates by employee level:

- `juniorRate`
- `midRate`
- `seniorRate`

In API-backed Add Time, the backend stores `projectRateSnapshot`; mock-only pages may still use the mock snapshot field. Worked value uses `approvedTime`, not raw logged `time`.

`ProjectPayment` records represent payments received for a Time & material project. Payment history and balance are shown in the `Payments` tab.

For API-backed Project Detail, the Payments tab now reads, creates, updates and deletes payments through backend Project payment endpoints for Time & material projects. These mock payment records remain for Dashboard, reports and other mock-only pages.

Formulas:

- `WorkedValue = sum(approvedTime * projectRateSnapshot)`
- `TotalPaymentsReceived = sum(ProjectPayment.amount)`
- `CurrentBalance = TotalPaymentsReceived - WorkedValue`
- `MonthlyBalance = PaymentsReceivedInMonth - WorkedValueInMonth`
- `CumulativeBalance = sum(payments up to month) - sum(worked value up to month)`

Balance statuses:

- `Credit available`: balance is positive.
- `Balanced`: balance is zero.
- `Over credit`: balance is negative.

### Fixed price

Fixed price projects use `Project.fixedAmount`. They do not use payment tracking in the current frontend. The main economic comparison is between the fixed amount and internal value used.

Formulas:

- `InternalValueUsed = sum(approvedTime * defaultRateSnapshot)`
- `BudgetConsumption = InternalValueUsed / FixedAmount`
- `EffectiveHourlyAverage = FixedAmount / ApprovedHours`
- `RemainingTheoreticalMargin = FixedAmount - InternalValueUsed`

The UI highlights over-budget cases when internal value exceeds the fixed amount.

### Annual retainer

Annual retainer projects use `ProjectContractPeriod` records. A single project can have multiple periods, so there is no need to create a new project every year.

Time entries are assigned to periods by `TimeEntry.date`, checking whether the entry date is inside `ProjectContractPeriod.startDate` and `ProjectContractPeriod.endDate`. Because assignment is based on individual time entries, a single `WorkItem` can contribute to multiple contract periods if it has time entries in different periods.

Formulas:

- `InternalValueUsedInPeriod = sum(approvedTime * defaultRateSnapshot)` where `TimeEntry.date` is inside the period.
- `Balance = ContractPeriod.amount - InternalValueUsedInPeriod`
- `ConsumptionPercentage = InternalValueUsedInPeriod / ContractPeriod.amount`
- `ExpectedCumulativeValue` is linear across the period.
- `Delta = ExpectedCumulativeValue - ActualCumulativeInternalValue`

Current frontend notes:

- Active period detection uses the current date and period date interval.
- The UI warns when there is no active period.
- The UI warns when internal usage exceeds the active period amount.
- On API-backed Project Detail, linear `ExpectedCumulativeValue` and `Delta` values are returned by backend Annual retainer economics DTOs and formatted by the frontend.

### Internal

Internal projects do not use payments or billing tracking. The Admin UI shows internal value and people involved.

Formula:

- `InternalValue = sum(approvedTime * defaultRateSnapshot)`

Employee users do not see internal economic values.

## 6. Time tracking rules

- Time is entered by employees through the API-backed Add Time dialog.
- Admin users can also enter time for another employee. The dialog loads active employees from `Employee/GetActiveEmployees`; Employee users use their backend current employee and cannot select another employee.
- `approvedTime` is admin-only information.
- Economic calculations use `approvedTime`.
- Employee users must not see `approvedTime`.
- Time entries must always be linked to a `WorkItem`; the Add Time action is disabled until a work item is selected.
- Closed work items can still receive time if the user enables `Include closed` in the Add Time dialog.
- Closed projects are not explicitly blocked by the current Add Time code; if their work items are selectable through the backend WorkItem filter, time can be entered. To verify before final product policy.
- Time is entered in 0.5 hour increments. The Add Time dialog uses half-hour options.
- Employees can modify entries only until the day after the entry date. This is enforced by `TimeEntryService`; the frontend shows backend validation errors.

## 7. Vacation, permissions and overtime

Vacation and permission requests are hour-based `LeaveRequest` records. API-backed My Day creates and previews them through backend LeaveRequest APIs. The Approvals page approves or rejects backend leave requests through Admin-only endpoints. Mock leave records remain only for Dashboard, Reports and other still-mock consumers.

Approval statuses:

- `Pending approval`
- `Approved`
- `Rejected`

Daily completeness is calculated per active employee and day. It combines work item hours and approved leave/permission hours.

Formulas:

- `DailyTotal = work item hours + approved vacation/permission hours`
- `MissingHours = expectedDailyHours - DailyTotal`, if positive
- `OvertimeHours = DailyTotal - expectedDailyHours`, if positive

Current frontend behavior:

- `workItemHours` uses logged `TimeEntry.time`.
- `leaveHours` includes only approved leave requests.
- If total is below expected hours, status becomes `Missing hours`.
- If total is above expected hours and overtime is approved, status becomes `Overtime approved`.
- If total is above expected hours and overtime is not approved, status becomes `Overtime pending`.
- In API-backed flows, `TimeEntryService` creates or updates pending `OvertimeRequest` records when daily total exceeds `expectedDailyHours`.
- The Approvals page loads those backend overtime requests and calls backend approve/reject endpoints; mock overtime records remain for Dashboard/Reports only.

## 8. Role visibility rules

Route and navigation authorization use the backend current user returned by `/api/Auth/Me`. API-backed pages such as Settings and Project Detail use `useAuth().isAdmin`. Mock-only pages can still read `useWorkLog().role`, including the demo role switcher when enabled.

Admin can see:

- `ApprovedTime`
- rates
- calculated values
- `Economics` tab
- `Payments` tab
- `Contract Periods` tab
- `Customer Reports`
- `Approvals`
- `Settings`

Employee must not see:

- `ApprovedTime`
- rates
- calculated values
- economic cards
- `Customer Reports`
- admin `Approvals`
- admin `Settings`

Current implementation notes:

- Admin-only navigation items are hidden from Employee users using backend current-user state.
- Admin-only routes redirect Employee users to `/my-day`.
- Project Detail conditionally renders economics, payments, contract periods, settings, billing values and approved time columns based on backend `isAdmin`.
- The demo role switcher is not a backend security boundary and should not be used to test API authorization.

## 9. Implemented pages

### Dashboard

- Purpose: Admin overview of WorkLog activity, KPIs, missing hours, customer/project economics, and recent work.
- Main data used: employees, customers, projects, work items, time entries, leave requests.
- Main actions: navigation to project/work item details and high-level monitoring.
- Visibility: Admin-only route. Employee users are redirected to My Day.

### My Day

- Purpose: API-backed employee daily workspace for selected-day time, leave preview, expected hours, and overtime/missing-hours status.
- Main data used: backend current user, `TimeEntry/GetTimeEntries`, `LeaveRequest/GetLeaveRequests`, assigned Work Items from `WorkItem/GetWorkItems`, and `TimeCompleteness/GetTimeCompleteness`.
- Main actions: Add Time through the API-backed dialog, create Vacation/Permission requests through `LeaveRequest/CreateLeaveRequest`, and navigate selected date. TimeEntry edit in My Day is pending.
- Visibility: Admin and Employee. Admin sees their own linked employee profile rather than a full admin completeness page.

### Projects

- Purpose: Project list with status/payment filters and summary metrics.
- Main data used: projects, customers, work items, time entries.
- Main actions: filter/search projects, open Project Detail, create/edit projects for Admin.
- Visibility: Admin and Employee, with Admin-only creation/editing controls.

### Project Detail

- Purpose: Detailed project page with overview, work items, time entries, milestones, and economics.
- Main data used: backend project detail, customer, milestones, project work items, economics, payments and contract periods.
- Main actions: view API-backed overview/economics/work items, create/update/delete milestones, create/update/delete Time & material payments, create/update/delete Annual retainer contract periods, and edit base project fields.
- Visibility: Admin and Employee can view allowed project detail data; economics, payments, contract periods, billing values and write actions are Admin-only. The Time Entries tab is API-backed; editing is handled from global Time Entries in this phase.

### Work Items

- Purpose: API-backed work item list with filters and responsive desktop/mobile presentation.
- Main data used: backend Work Item list DTOs from `WorkItem/GetWorkItems`, plus backend project/status reference data for filter labels.
- Main actions: filter/search work items, open the API-backed detail route and create Work Items as Admin. Comments remain pending.
- Visibility: Admin and Employee. Approved hours are shown only when returned by the backend for Admin users.

### Work Item Detail

- Purpose: API-backed work item view with status, priority, metadata and logged/approved hour summary.
- Main data used: backend Work Item detail DTO from `WorkItem/GetWorkItem`.
- Main actions: review metadata and update editable Work Item fields as Admin, including status, priority and assignment. Comments retrieval/write UI remains pending.
- Visibility: Admin and Employee. Approved hours are shown only when returned by the backend for Admin users.

### Time Entries

- Purpose: Time entry list and admin approval/edit view.
- Main data used: backend time entries, active employees for Admin filters, backend projects/customers and backend Work Items for edits.
- Main actions: filter time entries through backend filters, edit logged time/WorkItem/date/notes through `TimeEntry/UpdateTimeEntry`, and edit ApprovedTime as Admin through `TimeEntry/UpdateApprovedTime`.
- Visibility: Admin and Employee, with Admin-only employee filters, approved time, values, and edit controls.

Project Detail Time Entries, global Time Entries, My Day and Time Completeness now read backend rows or backend summaries through API endpoints. Add Time creates backend records through `TimeEntry/CreateTimeEntry`. Mock TimeEntry rows remain for Dashboard and reports until those pages are integrated.

For API-backed TimeEntry flows, Employee users receive backend DTOs scoped to their own `EmployeeId`. ApprovedTime, AdminNote, employee level snapshot, employee default rate snapshot, project rate snapshot and calculated value are null in non-admin responses. Mock-only pages may still carry broader mock fields until those pages are replaced.

### Time Completeness

- Purpose: Daily completeness overview by employee and date.
- Main data used: backend `TimeCompleteness/GetTimeCompleteness` rows and active employees for filters.
- Main actions: filter by date range/status/employee and inspect backend-owned missing hours and overtime states.
- Visibility: Admin-only route. My Day remains the employee-facing completeness summary.

### Approvals

- Purpose: Review pending leave and overtime requests.
- Main data used: backend leave requests, backend overtime requests/detail rows and active employees for filters.
- Main actions: approve/reject leave and overtime through backend APIs, inspect leave approval history and review overtime day TimeEntries.
- Visibility: Admin-only route.

### Customer Reports

- Purpose: Customer-facing/admin reporting over time entries.
- Main data used: customers, projects, work items, time entries.
- Main actions: filter by customer/date/project, view charts/tables, export CSV.
- Visibility: Admin-only route.

### Settings

- Purpose: Admin configuration for Statuses, Customers and Employees.
- Main data used: backend status configs, customers, employees and linked `WorkLogUser` records.
- Main actions: create/update configurable statuses, add/update customers, add/update employees, and manage related application access behind the scenes.
- Visibility: Admin-only route.

### User Settings

- Purpose: Current user profile/preferences screen.
- Main data used: current user.
- Main actions: update mock profile/preferences and navigate back.
- Visibility: Admin and Employee.

## 10. Reusable frontend components and patterns

- App shell: `AppLayout` wraps the app with `WorkLogProvider`, sidebar, top bar, mobile bottom navigation, and Add Time dialog.
- Sidebar: desktop navigation with collapse behavior and role-filtered items.
- Top bar: global search placeholder, Work Item quick action, Add Time action, role switcher, and user menu.
- Mobile bottom navigation: compact primary navigation for mobile, with role-aware `More` target.
- Add Time dialog: API-backed responsive dialog/drawer for logging work item time.
- Create Work Item dialog: creates frontend-only manual work items.
- Leave Request dialog: My Day uses an API-backed vacation/permission request dialog. Legacy mock leave helpers remain only for still-mock pages.
- Badges: shared status, priority, payment type, leave type, and level badges.
- KPI cards: compact cards used across dashboard, project detail, reports, and completeness views.
- Desktop tables: table components for wide layouts and admin views.
- Mobile cards: card-based alternatives for smaller screens.
- Tabs: used for Project Detail, Reports, Approvals, Settings, and User Settings.
- Filters: search fields, status tabs, date filters, customer/project/employee selects.
- Empty states: inline no-data messages and empty cards.
- Toast notifications: `sonner` is used for success feedback in mock actions.

## 11. Mock-only areas

The following areas are still mock-only until their API integration phases:

- Dashboard data and KPIs.
- Work Item comments retrieval UI.
- Customer Reports.
- Mock-context CRUD used by those pages for entities already backed elsewhere.

## 12. Notes for remaining API implementation

Entities already represented in backend Domain/Application models include:

- `Employee`
- `Customer`
- `Project`
- `ProjectMilestone`
- `WorkItem`
- `TimeEntry`
- `ProjectPayment`
- `ProjectContractPeriod`
- `LeaveRequest`
- `OvertimeRequest`
- `WorkItemComment`
- `StatusConfig`

Calculations already owned or intended to stay owned by backend/domain services:

- approved-time based billing values
- Time & material worked value and balance
- Fixed price internal value, budget consumption, and remaining margin
- Annual retainer period assignment, consumption, balance, and expected-vs-actual tracking
- daily completeness, missing hours, and overtime creation;
- report exports when they become official customer/admin reports.

Frontend calculations can remain duplicated for display only when:

- the backend returns authoritative totals;
- frontend calculations are used only for optimistic UI or local visual summaries;
- the UI clearly avoids treating frontend-only values as trusted security/business values.

API endpoints should follow the current WebApp convention:

- `api/[controller]/[action]`
- examples: `Project/GetProject`, `Project/DeleteProjectPayment`, `WorkItem/GetWorkItems`, `WorkItem/GetWorkItem`, `TimeEntry/GetTimeEntries`

Security considerations:

- `approvedTime`, rates, internal values, worked values, balances, payments, and contract period economics must be authorized server-side.
- Employee users must not be able to fetch admin-only economics and merely hide them in the UI.
- Role switching is currently a mock UI tool and must not influence real authorization.
- Backend APIs should enforce project/customer access boundaries.
- Report export endpoints must check permissions and avoid leaking economic data to unauthorized users.
- Time entry creation should validate work item/project state according to the final business rules.
