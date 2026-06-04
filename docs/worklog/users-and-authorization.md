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

## Pending

- Customer portal pages.
- Customer project/work item visibility.
- Customer-specific authorization rules.
- More granular employee permissions.
- Pagination for admin WorkLogUser management.
