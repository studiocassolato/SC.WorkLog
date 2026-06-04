# WorkLog Users and Authorization

WorkLog uses Cognito only as the identity provider. Application access is owned by WorkLog through the `WorkLogUser` aggregate.

There is no separate WorkLog Users page for now. Admin users manage application access behind the scenes from Settings Employees and Settings Customers.

## User Types

`WorkLogUser` supports:

- `Employee`: internal users, authenticated through Cognito federated Azure AD login.
- `Customer`: future customer portal users, authenticated through Cognito email/password login.

Customer users can be modeled and can authenticate with Cognito, but customer application access is currently disabled.

## Roles

`WorkLogUserRole` supports:

- `Admin`: valid only for employee users.
- `Employee`: valid only for employee users.
- `Customer`: valid only for customer users.

The frontend Admin/Employee role switcher is demo-only and is not a security boundary.

## Employee Profile

`Employee` remains the operational profile for internal staff:

- first name;
- last name;
- email;
- level;
- default hourly rate;
- expected daily hours;
- active flag.

`Employee.Role` has been removed. Authorization must use `WorkLogUser.Role`.

Settings Employees manages the linked Employee-type `WorkLogUser` from the employee create/edit form:

- enabling login creates or updates a linked `WorkLogUser`;
- role is `Employee` or `Admin`;
- `EmployeeId` points to the saved employee;
- email and display name follow the employee profile;
- disabling login deactivates the linked `WorkLogUser`.

## Customer Profile

`Customer` remains the customer company profile. Customer portal users are modeled as Customer-type `WorkLogUser` records linked through `CustomerId`.

Customer portal access remains disabled. Customer users can be created and maintained for future use, but backend current-user resolution still blocks Customer users.

## Current Behavior

Backend current-user resolution:

1. Validate Cognito JWT.
2. Read Cognito `sub` and email claims.
3. Resolve `WorkLogUser` by `CognitoSub`.
4. Fallback to `WorkLogUser.Email`.
5. Reject missing or inactive users.
6. Reject customer users because the customer portal is not enabled yet.
7. For employee users, require a linked active `Employee`.

`/api/Auth/Me` returns the Application DTO `CurrentUserResponse`. The frontend current-user type is aligned to that response shape, but role/profile authority remains the backend `WorkLogUser`; frontend role switching is still demo-only.

## Time Entry Authorization

Backend services are the authorization boundary. Frontend hiding is only a UX layer.

- `TimeEntry/GetTimeEntries` scopes non-admin users to `WorkLogUserContext.EmployeeId`, regardless of a missing or spoofed `EmployeeId` query parameter.
- Employee users can create and update only their own TimeEntries; Admin users can create/update for another active employee.
- `CreateTimeEntryRequest` and `UpdateTimeEntryRequest` do not accept `ProjectId`, `ApprovedTime`, rates or snapshots. The backend derives `ProjectId` from the selected WorkItem and owns snapshots.
- `TimeEntry/UpdateApprovedTime` is Admin-only and is the only ApprovedTime write path.
- Non-admin TimeEntry DTO responses return null for ApprovedTime, AdminNote, employee level snapshot, employee default rate snapshot, project rate snapshot and calculated value.

Project billing values, payments, contract periods, project economics, customer reports, overtime administration and settings remain Admin-only. Project detail read models also hide billing fields, approved-hour summaries and team member levels from non-admin responses.

## Leave Request Authorization

Backend services are the authorization boundary for leave and permission flows:

- `LeaveRequest/GetLeaveRequests` scopes non-admin users to `WorkLogUserContext.EmployeeId`, regardless of a missing or spoofed `EmployeeId` query parameter.
- Employee users can create only their own Vacation/Permission requests from My Day.
- Admin users can create for another active employee through the service contract, but the My Day UI defaults to the Admin user's linked employee profile and is not a broad admin leave-entry screen.
- Missing or inactive employees are rejected.
- Leave hours must be positive and use 0.5 hour increments.
- `LeaveRequest/ApproveLeaveRequest` and `LeaveRequest/RejectLeaveRequest` are Admin-only at controller policy level and guarded again in `LeaveRequestService`.
- `TimeCompletenessService` counts only approved leave. Pending and rejected leave does not contribute to daily completeness.

## Overtime and Completeness Authorization

Overtime approval and operational completeness review are Admin workflows:

- `OvertimeRequest/GetOvertimeRequests`, `GetOvertimeRequest`, `ApproveOvertimeRequest` and `RejectOvertimeRequest` are Admin-only at controller policy level and guarded again in `OvertimeRequestService`.
- Employee users cannot list all overtime requests and cannot approve/reject overtime.
- Overtime detail can include same-day TimeEntries for Admin review.
- Approving overtime stores approved hours and marks the request Approved; rejecting overtime sets approved hours to 0 and marks the request Rejected.
- `TimeCompleteness/GetTimeCompleteness` is authenticated because My Day consumes it, but `TimeCompletenessService` scopes non-admin users to `WorkLogUserContext.EmployeeId`.
- The Time Completeness page is Admin-only in routing. My Day remains the employee-facing daily completeness view.
- The backend service, not the frontend, owns expected hours, worked hours, approved leave, missing hours and overtime status.

## Pending

- Customer portal pages.
- Customer project/work item visibility.
- Customer-specific authorization rules.
- More granular employee permissions.
- Pagination for admin WorkLogUser management.
