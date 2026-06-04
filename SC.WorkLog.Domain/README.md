# SC.WorkLog.Domain

This project contains the initial WorkLog backend domain model.

## Included

- Aggregate roots for employees, customers, projects, work items, time entries, project payments, annual retainer contract periods, leave/overtime requests, comments, milestones, and status configuration.
- Domain enums for employee levels, project payment types, statuses, work item priorities/origins, leave request types, and request statuses.
- Basic constructor/update validation with `ArgumentException`, following the repository conventions.
- `AuditInfo` usage for persistent aggregates.

## Intentionally not implemented yet

- API endpoints.
- Application services and DTOs.
- Persistence-specific repositories or indexes.
- Backend calculation services for project economics, time completeness, reports, or billing.
- Authentication, Cognito, authorization policies, or role enforcement.
- Frontend integration or replacement of mock data.

## Notes

Annual retainer amounts are modeled through `ProjectContractPeriod.Amount`; `Project` intentionally does not include `AnnualAmount` as a canonical backend field.
