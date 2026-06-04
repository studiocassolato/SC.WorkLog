# WorkLog Local Seed

This document describes the explicit local/development initialization command for default Work Item statuses.

## Default Work Item Statuses

Run from the repository root:

```powershell
dotnet run --project SC.WorkLog.ConsoleTester -- EnsureDefaultStatuses
```

The command uses the configured `DbSettings` for `SC.WorkLog.ConsoleTester`. The development database is currently `SCWorkLog`.

The command only ensures default `StatusConfig` records. It does not seed employees, admin users, customers, projects, work items, time entries or customer portal data.

Default statuses are matched by stable `Key`:

- `new`: New, typology `New`, customer display name `New`, order `10`, active.
- `in-progress`: In progress, typology `InProgress`, customer display name `In progress`, order `20`, active.
- `code-review`: Code review, typology `InProgress`, customer display name `In progress`, order `30`, active.
- `under-analysis`: Under analysis, typology `WaitingInternal`, customer display name `In progress`, order `40`, active.
- `waiting-for-customer`: Waiting for customer, typology `WaitingCustomer`, customer display name `Waiting for customer`, order `50`, active.
- `closed`: Closed, typology `Closed`, customer display name `Closed`, order `90`, active.
- `happy-customer`: Happy customer, typology `Archived`, customer display name `Happy customer`, order `100`, active.

## Idempotency

The command is safe to run multiple times:

- existing statuses are matched by `Key`;
- existing customized `Name`, `CustomerDisplayName`, `Typology`, `Order` and `Active` values are not overwritten;
- missing default keys are created;
- duplicate default statuses are not created.

The command prints the database name, how many default keys already exist, how many are created, the created keys, validation result, and warnings when no active `New` status or no active closed typology status exists.

## Migration Note

`WorkItem` now stores `StatusKey`. Work items persisted with the old enum `Status` field or interim `StatusConfigId` field need a separate migration. For local/dev data, clearing and reseeding WorkItems may be acceptable. Real persisted data should map old status values or `StatusConfigId` references to the correct `StatusConfig.Key`.
