# Jira/Tempo Local Import

## Purpose

This document describes the local Jira/Tempo import foundation for WorkLog.

The import is a migration/local sync tool executed from `SC.WorkLog.ConsoleTester`. It is not a WebApp feature, not a scheduled job and not a bidirectional integration.

Jira and Tempo are read-only sources. The importer must not write, update, delete or transition anything in Jira or Tempo.

## Scope

Implemented in this phase:

- local ConsoleTester commands for Jira SUPPORT issues and Tempo/Jira worklogs;
- read-only Jira and Tempo HTTP clients;
- Application-level import orchestration;
- domain metadata on `WorkItem` and `TimeEntry`;
- `ExternalImportSyncState` persistence for import runs;
- idempotent create/update behavior;
- dry-run support;
- fake-client application tests.

Intentionally not implemented:

- frontend UI;
- WebApp endpoints;
- scheduled Hangfire jobs;
- bidirectional sync;
- writes to Jira or Tempo;
- comment import;
- attachment import;
- automatic customer/project creation;
- customer portal.

## Commands

Run from the repository root:

```bash
dotnet run --project SC.WorkLog.ConsoleTester -- ImportJiraSupportIssues --dry-run --max 100
dotnet run --project SC.WorkLog.ConsoleTester -- ImportJiraSupportIssues --full
dotnet run --project SC.WorkLog.ConsoleTester -- ImportJiraSupportIssues --update-only
dotnet run --project SC.WorkLog.ConsoleTester -- ImportJiraSupportIssues --issue SUPPORT-1234 --dry-run

dotnet run --project SC.WorkLog.ConsoleTester -- ImportJiraSupportTempoWorklogs --dry-run --max 100
dotnet run --project SC.WorkLog.ConsoleTester -- ImportJiraSupportTempoWorklogs --full
dotnet run --project SC.WorkLog.ConsoleTester -- ImportJiraSupportTempoWorklogs --update-only
dotnet run --project SC.WorkLog.ConsoleTester -- ImportJiraSupportTempoWorklogs --issue SUPPORT-1234 --since 2026-01-01 --dry-run
```

Supported options:

- `--full`: fetch the selected source broadly.
- `--update-only`: use sync-state timestamps as the default starting point.
- `--dry-run`: fetch/map/report without writing WorkItems, TimeEntries or sync state.
- `--issue SUPPORT-1234`: import one issue/worklog slice for testing.
- `--max 100`: limit batch size for testing.
- `--since yyyy-MM-dd`: override sync-state timestamp when useful.

Console output includes fetched, created, updated, skipped, warnings, errors, unmapped statuses, unknown customers, missing default projects, missing employees, previous sync timestamp, new sync timestamp and rate-limit summary when available.

Tokens are never printed by the importer.

## Local Settings

The HTTP clients use `LocalJiraTempoImportSettings` in Infrastructure. Current values are placeholders:

- Jira site: `https://studiocassolato.atlassian.net`
- Jira email: placeholder
- Jira API token: placeholder
- Tempo base URL: `https://api.tempo.io`
- Tempo token: placeholder
- optional Jira request participants custom field id

Hardcoded local tokens are acceptable only for the local ConsoleTester execution phase. Do not log tokens and do not expose real tokens in docs.

## Architecture

Domain:

- `WorkItem.Jira` stores Jira issue metadata.
- `TimeEntry.Jira` stores Tempo/Jira worklog metadata.
- `ExternalImportSyncState` tracks local import state.

Infrastructure:

- `JiraApiClient` performs read-only Jira search calls.
- `TempoApiClient` performs read-only Tempo worklog calls.
- Jira/Tempo source models live in `SC.WorkLog.Infrastructure.ExternalImport`.

Application:

- `JiraImportService` orchestrates fetch, mapping, validation, idempotency, persistence and sync-state updates.
- It maps Infrastructure source models to Domain aggregate changes.
- It uses the generic `IRepository<TEntity>` only; no entity-specific repositories are introduced.

ConsoleTester:

- exposes explicit commands only;
- calls `WorkLogDatabaseIndexes.EnsureCreatedAsync()` before import;
- delegates business behavior to `JiraImportService`.

## Issue Import

Jira source:

- site: `studiocassolato.atlassian.net`;
- project key: `SUPPORT`;
- JQL: `project = SUPPORT`, optionally filtered by key or updated timestamp;
- paginated through Jira search.

Mapping:

- Jira issue key becomes `WorkItem.Code`.
- Jira summary becomes `WorkItem.Title`.
- Jira description is stored as HTML in `WorkItem.Description`.
- If Jira returns Atlassian Document Format, the client converts common nodes to HTML.
- If conversion falls back, a warning is stored in `WorkItem.Jira.ImportWarnings`.
- `WorkItem.Origin = Jira`.
- `WorkItem.ExternalReference` is the issue URL when available, otherwise the issue key.
- Jira priority maps to `WorkItemPriority`.
- Jira status maps to `StatusConfig.Name`, case-insensitive and trimmed.
- Jira assignee email maps to active `Employee.Email`; missing employees leave `AssigneeId = null`.
- Jira reporter email domain drives customer detection.
- Jira created date becomes `OpeningDate`.
- Closing date is set only when mapped status is closed and Jira resolution date is available.

Status mapping:

- Active `StatusConfig.Name` is matched case-insensitively.
- `StatusConfig.Key` is not used for matching Jira status names.
- Missing mappings use fallback key `in-progress`.
- Missing mappings do not fail the import and are reported as warnings.
- The importer does not create `StatusConfig` records automatically.

Priority mapping:

- Highest, Critical, Blocker -> `Urgent`
- High, Major -> `High`
- Medium, Normal -> `Normal`
- Low, Lowest, Minor -> `Low`
- missing/unknown -> `Normal`

Customer/project detection:

- reporter email domain is extracted after `@`;
- customer is matched against `Customer.CompanyDomain`;
- multiple domains can be separated by semicolon, comma or spaces;
- once customer is found, the importer requires that customer's `Project.IsDefault = true` project;
- missing customer or missing default project skips the issue with a warning;
- customers and projects are not created automatically.

Idempotency:

- primary match: `WorkItem.Code == Jira IssueKey`;
- fallback match: `WorkItem.Jira.IssueId`;
- existing imported WorkItems are updated from Jira fields;
- repeated runs do not create duplicate WorkItems.

## Worklog Import

Tempo is treated as the preferred worklog source. Jira worklog ids are stored when present, but Jira worklog API is not used unless a future fallback is added.

Mapping:

- WorkItem is found by Jira issue key / `WorkItem.Code`;
- Employee is found by Tempo/Jira author email against active `Employee.Email`;
- `TimeEntry.WorkItemId` is set from the matched WorkItem;
- `TimeEntry.ProjectId` is derived from the matched WorkItem's project;
- date comes from worklog start date;
- `Time` is `timeSpentSeconds / 3600`;
- `ApprovedTime` initially equals `Time`;
- description comes from the worklog description/comment;
- source metadata is stored in `TimeEntry.Jira`.

The importer does not accept ProjectId or approved time from Tempo/Jira as authoritative.

Idempotency:

- primary match: `TimeEntry.Jira.TempoWorklogId`;
- fallback: `TimeEntry.Jira.JiraWorklogId`;
- final fallback: issue key + author email + started timestamp + time spent seconds.

Missing WorkItems or employees skip the worklog with warnings. No employee is guessed.

## Sync State

`ExternalImportSyncState` is temporary migration state and can be deleted when Jira is abandoned.

Tracked fields include:

- source (`JiraIssues` or `TempoWorklogs`);
- project key (`SUPPORT`);
- mode;
- started/completed/successful timestamps;
- status (`Running`, `Succeeded`, `Failed`, `SucceededWithWarnings`);
- last error and warnings;
- source-specific last imported timestamp;
- fetched/created/updated/skipped/error counters.

Rules:

- non-dry-run import marks sync state as `Running` on start;
- success updates status and `LastSuccessfulSyncAt`;
- warnings result in `SucceededWithWarnings`;
- failures store error summary;
- dry-run does not write sync state;
- update-only uses `LastIssueUpdatedAtImported`, `LastWorklogUpdatedAtImported` or `LastSuccessfulSyncAt`.

MongoDB indexes include unique `Source + ProjectKey`.

Tempo updated-since behavior depends on available Tempo API semantics. The current client filters updated timestamps when present and keeps idempotency as the duplicate protection fallback.

## Required Access

Required read permissions:

- Jira issue search/read for project `SUPPORT`;
- Jira fields used by issue mapping, including reporter, assignee, status, priority and optional request participants;
- Tempo worklog read access for SUPPORT issues and relevant date ranges.

## Known Limitations

- No comments import.
- No attachments import.
- No bidirectional sync.
- No writes to Jira or Tempo.
- No automatic customer/project creation.
- No customer portal.
- No realtime sync.
- No Hangfire schedule yet.
- Tempo updated-since support may require refinement after checking live API behavior.
- DB-level unique partial constraint for default project is not implemented; `ProjectService` enforces the invariant.
