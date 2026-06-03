# WorkLog Frontend Mock Model

## 1. Purpose

The current WorkLog frontend is a Vite/React mock application imported from the v0 prototype and stabilized inside `SC.WorkLog.WebApp/client-app`.

All data is local mock data from `src/lib/mock-data.ts`. Runtime state and create/update actions are kept only in React state through `src/lib/worklog-context.tsx`. No backend API, database persistence, Cognito authentication, or authorization service is currently implemented.

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

### ProjectMilestone

| Field | Type | Meaning | Important notes |
| --- | --- | --- | --- |
| `id` | `string` | Milestone identifier. | Nested in `Project.milestones`. |
| `projectId` | `string` | Owning project id. | Links milestone to project. |
| `title` | `string` | Milestone title. | Shown in Project Detail. |
| `date` | `string` | Milestone date. | Stored as string date. |

### WorkItem

| Field | Type | Meaning | Important notes |
| --- | --- | --- | --- |
| `id` | `string` | Work item identifier. | Referenced by `TimeEntry.workItemId` and `WorkItemComment.workItemId`. |
| `code` | `string?` | Optional work item code. | Used in lists/search when present. |
| `projectId` | `string` | Owning project id. | Links work item to project. |
| `title` | `string` | Work item title. | Main display value. |
| `description` | `string` | Work item details. | Shown in detail pages/dialogs. |
| `status` | `WorkItemStatus` | Work item workflow state. | Configured by `StatusConfig`. |
| `priority` | `WorkItemPriority` | Priority level. | Rendered through priority badges. |
| `assigneeId` | `string \| null` | Assigned employee id. | `null` means unassigned. |
| `origin` | `'Manual' \| 'Jira' \| 'Azure DevOps' \| 'Email'` | Source of the work item. | New UI-created work items use `Manual`. |
| `externalReference` | `string \| null` | External system reference. | Used for Jira/Azure DevOps/email references when present. |
| `openingDate` | `string` | Opening date. | Stored as string date. |
| `closingDate` | `string \| null` | Closing date. | `null` means not closed by date. |
| `isPriority` | `boolean?` | Priority marker for assignee. | Optional extra flag. |

### TimeEntry

| Field | Type | Meaning | Important notes |
| --- | --- | --- | --- |
| `id` | `string` | Time entry identifier. | Mock ids use `te-*`. |
| `employeeId` | `string` | Employee who entered time. | Admin can enter for another employee in the Add Time dialog. |
| `workItemId` | `string` | Linked work item id. | Required by the Add Time dialog. |
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
| `employeeNote` | `string` | Employee request note. | Submitted from Leave Request dialog. |
| `adminNote` | `string \| null` | Admin response note. | Set to simple mock values in Approvals. |

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
| `content` | `string` | Comment text. | Shown in Work Item Detail. |
| `isInternal` | `boolean` | Whether comment is internal. | Internal comments receive distinct styling. |
| `createdAt` | `string` | Comment timestamp. | Displayed in Work Item Detail. |

### StatusConfig

| Field | Type | Meaning | Important notes |
| --- | --- | --- | --- |
| `id` | `string` | Status config identifier. | Mock ids use `status-*`. |
| `name` | `WorkItemStatus` | Internal work item status. | Must match fixed status values. |
| `displayName` | `string` | Customer-facing label. | Example: `Open` is displayed as `New`. |
| `isClosed` | `boolean` | Whether the status is closed. | `Completed` and `Closed` are closed statuses in mock data. |
| `isInitial` | `boolean` | Whether this is the initial status. | `Open` is initial. |
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

### Work item statuses

- `Open`
- `In progress`
- `On hold`
- `Completed`
- `Closed`

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
- A `TimeEntry` is indirectly linked to a `Project` through `TimeEntry.workItemId -> WorkItem.projectId`.
- A `ProjectPayment` belongs to a `Project` through `ProjectPayment.projectId`.
- A `ProjectContractPeriod` belongs to a `Project` through `ProjectContractPeriod.projectId`.
- A `LeaveRequest` belongs to an `Employee` through `LeaveRequest.employeeId`.
- An `OvertimeRequest` belongs to an `Employee` and date through `OvertimeRequest.employeeId` and `OvertimeRequest.date`.
- A `WorkItemComment` belongs to a `WorkItem` and an `Employee` through `WorkItemComment.workItemId` and `WorkItemComment.employeeId`.

## 5. Project payment types and economics

Economic calculations are frontend-only mock calculations today. They are mostly implemented in `ProjectDetail.tsx` and are visible only to Admin users.

### Time & material

Time & material projects use project-specific rates by employee level:

- `juniorRate`
- `midRate`
- `seniorRate`

When a `TimeEntry` is created, the frontend stores a `projectRateSnapshot`. Worked value uses `approvedTime`, not raw logged `time`.

`ProjectPayment` records represent payments received for a Time & material project. Payment history and balance are shown in the `Payments` tab.

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
- To verify: the documented linear `ExpectedCumulativeValue` and `Delta` concepts are represented in the intended retainer behavior, but the current UI implementation should be reviewed before moving this calculation backend-side.

### Internal

Internal projects do not use payments or billing tracking. The Admin UI shows internal value and people involved.

Formula:

- `InternalValue = sum(approvedTime * defaultRateSnapshot)`

Employee users do not see internal economic values.

## 6. Time tracking rules

- Time is entered by employees through the Add Time dialog.
- Admin users can also enter time for another employee.
- `approvedTime` is admin-only information.
- Economic calculations use `approvedTime`.
- Employee users must not see `approvedTime`.
- Time entries must always be linked to a `WorkItem`; the Add Time action is disabled until a work item is selected.
- Closed work items can still receive time if the user enables `Include closed` in the Add Time dialog.
- Closed projects are not explicitly blocked by the current Add Time code; if their work items are selectable, time can be entered. To verify before backend implementation.
- Time is entered in 0.5 hour increments. The Add Time dialog uses half-hour options.
- Employees can modify entries only until the day after the entry date: To verify. The current UI shows edit affordances, but this rule is not clearly enforced in the inspected frontend code.

## 7. Vacation, permissions and overtime

Vacation and permission requests are hour-based `LeaveRequest` records. They are submitted from the Leave Request dialog and approved or rejected in the Approvals page.

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
- When adding a time entry pushes an employee above `expectedDailyHours`, the mock context creates or updates an `OvertimeRequest` for that employee/date.
- Approving overtime sets `approvedHours` to `calculatedHours`.
- Rejecting overtime sets `approvedHours` to `0`.

## 8. Role visibility rules

The current role model is frontend-only and uses a mock role switcher with values `Admin` and `Employee`.

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

- Admin-only navigation items are hidden from Employee users.
- Admin-only routes redirect Employee users to `/my-day`.
- Project Detail conditionally renders economics, payments, contract periods, settings, and approved time columns based on the role.

## 9. Implemented pages

### Dashboard

- Purpose: Admin overview of WorkLog activity, KPIs, missing hours, customer/project economics, and recent work.
- Main data used: employees, customers, projects, work items, time entries, leave requests.
- Main actions: navigation to project/work item details and high-level monitoring.
- Visibility: Admin-only route. Employee users are redirected to My Day.

### My Day

- Purpose: Employee daily workspace for today's time, leave, expected hours, and overtime status.
- Main data used: current user, time entries, work items, projects, leave requests, overtime requests.
- Main actions: Add Time, Request Leave, navigate/edit from listed entries.
- Visibility: Admin and Employee.

### Projects

- Purpose: Project list with status/payment filters and summary metrics.
- Main data used: projects, customers, work items, time entries.
- Main actions: filter/search projects, open Project Detail, create/edit projects for Admin.
- Visibility: Admin and Employee, with Admin-only creation/editing controls.

### Project Detail

- Purpose: Detailed project page with overview, work items, time entries, milestones, and economics.
- Main data used: project, customer, work items, time entries, payments, contract periods, employees.
- Main actions: view tabs, review economics, add payment/period mock dialogs, edit settings mock values.
- Visibility: Admin and Employee, but economic sections are Admin-only.

### Work Items

- Purpose: Work item list with filters and responsive desktop/mobile presentation.
- Main data used: work items, projects, customers, employees, time entries.
- Main actions: filter/search work items, open detail, create work item, add time.
- Visibility: Admin and Employee.

### Work Item Detail

- Purpose: Detailed work item view with status, priority, comments, metadata, and linked time.
- Main data used: work item, comments, projects, customers, employees, time entries.
- Main actions: change status, add comment, review metadata.
- Visibility: Admin and Employee. Economic details are not the focus of this page.

### Time Entries

- Purpose: Time entry list and admin approval/edit view.
- Main data used: time entries, employees, work items, projects, customers.
- Main actions: filter time entries, export data, edit approved time as Admin.
- Visibility: Admin and Employee, with Admin-only employee filters, approved time, values, and edit controls.

### Time Completeness

- Purpose: Daily completeness overview by employee and date.
- Main data used: employees, time entries, leave requests, overtime requests.
- Main actions: filter by week/status/employee, inspect missing hours and overtime states.
- Visibility: Admin and Employee in routing, but the data is operational/admin-like. To verify final product visibility.

### Approvals

- Purpose: Review pending leave and overtime requests.
- Main data used: leave requests, overtime requests, employees.
- Main actions: approve/reject leave, approve/reject overtime, inspect approval history.
- Visibility: Admin-only route.

### Customer Reports

- Purpose: Customer-facing/admin reporting over time entries.
- Main data used: customers, projects, work items, time entries.
- Main actions: filter by customer/date/project, view charts/tables, export CSV.
- Visibility: Admin-only route.

### Settings

- Purpose: Admin configuration for customers and employees.
- Main data used: customers, employees.
- Main actions: add/update customers, add/update employees.
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
- Add Time dialog: responsive dialog/drawer for logging work item time.
- Create Work Item dialog: creates frontend-only manual work items.
- Leave Request dialog: creates frontend-only vacation/permission requests.
- Badges: shared status, priority, payment type, leave type, and level badges.
- KPI cards: compact cards used across dashboard, project detail, reports, and completeness views.
- Desktop tables: table components for wide layouts and admin views.
- Mobile cards: card-based alternatives for smaller screens.
- Tabs: used for Project Detail, Reports, Approvals, Settings, and User Settings.
- Filters: search fields, status tabs, date filters, customer/project/employee selects.
- Empty states: inline no-data messages and empty cards.
- Toast notifications: `sonner` is used for success feedback in mock actions.

## 11. Mock-only areas

The following areas are mocked and must later be replaced or backed by backend/API behavior:

- data loading
- create/update/delete actions
- authentication
- role management
- permissions
- calculations if they move backend-side
- report generation
- persistence
- customer/domain login behavior
- project payment creation
- contract period creation
- audit fields such as `createdBy` and `createdOn`

## 12. Notes for backend implementation

Entities that should likely become backend/domain entities:

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

Calculations that should probably be backend-owned:

- approved-time based billing values
- Time & material worked value and balance
- Fixed price internal value, budget consumption, and remaining margin
- Annual retainer period assignment, consumption, balance, and expected-vs-actual tracking
- daily completeness, missing hours, and overtime creation
- report exports when they become official customer/admin reports

Frontend calculations can remain duplicated for display only when:

- the backend returns authoritative totals;
- frontend calculations are used only for optimistic UI or local visual summaries;
- the UI clearly avoids treating frontend-only values as trusted security/business values.

Suggested API boundaries:

- `/api/employees`
- `/api/customers`
- `/api/projects`
- `/api/projects/{projectId}/work-items`
- `/api/work-items/{workItemId}/comments`
- `/api/time-entries`
- `/api/projects/{projectId}/payments`
- `/api/projects/{projectId}/contract-periods`
- `/api/leave-requests`
- `/api/overtime-requests`
- `/api/reports/customer`
- `/api/time-completeness`

Security considerations:

- `approvedTime`, rates, internal values, worked values, balances, payments, and contract period economics must be authorized server-side.
- Employee users must not be able to fetch admin-only economics and merely hide them in the UI.
- Role switching is currently a mock UI tool and must not influence real authorization.
- Backend APIs should enforce project/customer access boundaries.
- Report export endpoints must check permissions and avoid leaking economic data to unauthorized users.
- Time entry creation should validate work item/project state according to the final business rules.
