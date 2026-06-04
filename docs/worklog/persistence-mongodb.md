# WorkLog MongoDB Persistence

This document describes the initial MongoDB persistence layer for WorkLog.

## Repository Pattern

WorkLog follows the existing project repository convention:

- repository interfaces live in `SC.WorkLog.Domain.Interfaces`;
- repository implementations live in `SC.WorkLog.Infrastructure.Repository`;
- the generic `IRepository<TEntity>` / `Repository<TEntity>` pattern is used for domain aggregate roots;
- no dedicated repository interface has been added for each WorkLog entity;
- no Unit of Work or EF-style migration layer is used.

`Repository<TEntity>` uses the MongoDB collection named after the domain type:

```csharp
database.GetCollection<TEntity>(typeof(TEntity).Name)
```

## Collection Models

Domain entities are the MongoDB collection models. No duplicate document classes such as `EmployeeDocument` or `ProjectDocument` are created.

Configured collection models:

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
- `WorkLogUser`

No `CompanySettings` collection is part of the current scope. Expected daily hours are stored per `Employee`; leave, permission and overtime approvals are handled through workflow/admin records. A minimal company profile for report branding can be introduced later if required.

`StatusConfig` stores configurable Work Item workflow statuses. `Id` is the technical aggregate id. `Key` is the stable readable unique lowercase kebab-case reference, while status names are free editable internal labels grouped by the fixed `WorkItemStatusTypology` enum. `IsClosed` and `IsInitial` are not persisted; closed/open behavior is derived from typology, and the initial/default status is the first active `New` typology ordered by `Order`.

`WorkItem` stores `StatusKey` as the actual status reference, so MongoDB queries, seeding and migrations can use stable readable values while multiple workflow statuses can share the same typology.

Existing persisted WorkItem records created with the previous enum-based `Status` field or the interim `StatusConfigId` field need a data migration to set `StatusKey` before those records can participate in API-backed WorkItem/project summary flows. Local/dev data can be cleared and reseeded if acceptable. Real persisted data should map old `Open`/`New` to `new`, old `InProgress` to `in-progress`, old `OnHold` to `waiting-for-customer` or `under-analysis` based on the previous meaning, old `Completed`/`Closed` to `closed`, and old `StatusConfigId` by looking up the related `StatusConfig.Key`.

`ProjectMilestone` currently follows the domain model as a separate aggregate root and therefore has its own collection. It is not embedded in `Project`.

## MongoDB Registration

MongoDB-specific DI registration is encapsulated in `MongoPersistenceExtensions.AddMongoPersistence()`.

The application composition root calls this extension from `AddApplicationServices`, preserving the existing convention where application startup registers infrastructure dependencies.

Registered components:

- `PrepareDatabase` as singleton for BSON conventions.
- `IMongoClient` as singleton, so the driver connection pool is reused.
- `IMongoDatabase` as singleton, resolved from `DbSettings.Database`.
- `IRepository<>` to `Repository<>`.
- `WorkLogDatabaseIndexes`.

No custom pool sizes or timeout values are hardcoded at this stage. Driver defaults are used until real deployment/concurrency data is available.

## BSON Conventions

`PrepareDatabase` registers the current WorkLog BSON conventions:

- enums are serialized as strings;
- null values are ignored;
- aggregate `Guid` values use the standard BSON Guid representation.

Domain aggregate IDs remain `Guid`. Decimal values remain `decimal` in domain entities and are handled by the MongoDB driver conventions.

## Configuration

Connection settings use the existing `DbSettings` POCO in `SC.WorkLog.Common.Settings`.

Base appsettings files contain placeholders only:

- `DefaultConnection`
- `Database`

Development appsettings use the local placeholder:

- `mongodb://localhost:27017`
- `SCWorkLog`

Default Work Item statuses can be initialized explicitly for local/development data with `dotnet run --project SC.WorkLog.ConsoleTester -- EnsureDefaultStatuses`. This is not run automatically by WebApp startup and does not seed unrelated collections.

No secrets or real production connection strings are included.

## Indexes

Index creation is defined in `WorkLogDatabaseIndexes.EnsureCreatedAsync()`. It is intentionally explicit and can be called by a future startup task, admin command, deployment step or maintenance endpoint.

Configured indexes:

- `Employee`: unique `Email`.
- `Customer`: `CompanyName`.
- `Project`: `CustomerId`, `PaymentType`, `Status`, compound `CustomerId + Status`.
- `ProjectMilestone`: `ProjectId`, compound `ProjectId + Date`.
- `WorkItem`: `ProjectId`, `AssigneeId`, `StatusKey`, `Priority`, compound `ProjectId + StatusKey`, compound `AssigneeId + StatusKey`.
- `TimeEntry`: `WorkItemId`, `Date`, compound `EmployeeId + Date`, compound `WorkItemId + Date`.
- `ProjectPayment`: compound `ProjectId + PaymentDate`.
- `ProjectContractPeriod`: compound `ProjectId + StartDate + EndDate`, compound `ProjectId + StartDate`, compound `ProjectId + EndDate`.
- `LeaveRequest`: compound `EmployeeId + Date`, `Status`, compound `EmployeeId + Status`.
- `OvertimeRequest`: compound `EmployeeId + Date`, `Status`.
- `WorkItemComment`: compound `WorkItemId + CreatedAt`.
- `StatusConfig`: `Order`, `Typology`, `Active`, unique `Key`, unique `Name`.
- `WorkLogUser`: unique `Email`, unique `CognitoSub`, `UserType`, `Role`, `EmployeeId`, `CustomerId`, `Active`.

No text/search indexes are configured in this phase.

The current generic index helper does not support sparse unique indexes. `CognitoSub` is therefore configured as a regular unique index; until sparse index support is added, user records should provide a unique Cognito subject when persisted.

## Intentionally Pending

The following items are intentionally not implemented yet:

- replacement of frontend mock data;
- entity-specific repositories;
- MongoDB collection validators;
- MongoDB migrations or EF-style relational concepts;
- data migration for old enum-based WorkItem `Status` records or interim `StatusConfigId` records to `StatusKey`;
- automatic execution of index creation or seed commands during host startup;
- infrastructure integration tests requiring MongoDB.
