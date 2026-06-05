using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SC.WorkLog.Application.DTO.ExternalImport;
using SC.WorkLog.Domain.AggregateRoots;
using SC.WorkLog.Domain.Enums;
using SC.WorkLog.Domain.Interfaces;
using SC.WorkLog.Domain.ValueObjects;
using SC.WorkLog.Infrastructure.ExternalImport;

namespace SC.WorkLog.Application.Services.ExternalImport
{
    public class JiraImportService
    {
        private const string ProjectKey = "SUPPORT";
        private const string ImportUser = "jira-tempo-import";
        private const string FallbackStatusKey = "in-progress";
        private const string StudioCassolatoDomain = "studiocassolato.it";
        private const string LegacyMassimilianoZanatoEmail = "lab@massimilianozanato.com";
        private const string StudioMassimilianoZanatoEmail = "massimiliano.zanato@studiocassolato.it";
        private const string SkipOrganizationFallbackIssueKey = "SUPPORT-607";
        private const string Support1658IssueKey = "SUPPORT-1658";
        private const string AthenaOrganizationId = "7";
        private const string VitecgroupOrganizationId = "6";
        private const string AthenaDomain = "athena.eu";
        private const string VidendumDomain = "videndum.com";
        private const int DefaultPageSize = 100;

        private readonly IJiraApiClient _jiraApiClient;
        private readonly ITempoApiClient _tempoApiClient;
        private readonly IRepository<WorkItem> _workItems;
        private readonly IRepository<TimeEntry> _timeEntries;
        private readonly IRepository<Customer> _customers;
        private readonly IRepository<Project> _projects;
        private readonly IRepository<Employee> _employees;
        private readonly IRepository<StatusConfig> _statusConfigs;
        private readonly IRepository<ExternalImportSyncState> _syncStates;

        public JiraImportService(
            IJiraApiClient jiraApiClient,
            ITempoApiClient tempoApiClient,
            IRepository<WorkItem> workItems,
            IRepository<TimeEntry> timeEntries,
            IRepository<Customer> customers,
            IRepository<Project> projects,
            IRepository<Employee> employees,
            IRepository<StatusConfig> statusConfigs,
            IRepository<ExternalImportSyncState> syncStates)
        {
            _jiraApiClient = jiraApiClient;
            _tempoApiClient = tempoApiClient;
            _workItems = workItems;
            _timeEntries = timeEntries;
            _customers = customers;
            _projects = projects;
            _employees = employees;
            _statusConfigs = statusConfigs;
            _syncStates = syncStates;
        }

        public async Task<ExternalImportResult> ImportSupportIssuesAsync(ExternalImportOptions options)
        {
            options = NormalizeOptions(options);
            var source = ExternalImportSource.JiraIssues;
            var syncState = await GetSyncState(source);
            var result = CreateResult(source, options, syncState);
            var startedAt = DateTime.UtcNow;

            try
            {
                if (!options.DryRun)
                {
                    syncState.MarkRunning(options.Mode, startedAt, ImportUser);
                    await _syncStates.InsertOrReplace(syncState);
                }

                var updatedSince = GetIssueUpdatedSince(options, syncState);
                var statuses = await _statusConfigs.Get(x => x.Active);
                var customers = await _customers.Get(x => x.Active);
                var projects = await _projects.Get(x => x.IsDefault);
                var employees = await _employees.Get(x => true);
                var statusByName = statuses
                    .GroupBy(x => NormalizeComparable(x.Name))
                    .ToDictionary(x => x.Key, x => x.First());
                var fallbackStatus = statuses.FirstOrDefault(x => x.Key == FallbackStatusKey);
                if (fallbackStatus == null)
                    throw new ArgumentException($"Fallback status '{FallbackStatusKey}' is required.");

                DateTime? lastSourceTimestamp = null;
                var processed = 0;
                var pageToken = (string)null;
                var pageSize = PageSize(options);
                ExternalImportPage<JiraIssueImportDto> page;

                do
                {
                    page = await _jiraApiClient.GetSupportIssuesAsync(ProjectKey, updatedSince, options.IssueKey, pageToken, pageSize);
                    AppendRateLimitSummary(result, page.RateLimitSummary);
                    foreach (var issue in page.Items)
                    {
                        if (options.Max.HasValue && processed >= options.Max.Value)
                            break;

                        result.TotalFetched++;
                        processed++;
                        lastSourceTimestamp = Max(lastSourceTimestamp, issue.UpdatedAt);
                        await ImportIssueAsync(issue, customers, projects, employees, statusByName, fallbackStatus, options, result);
                    }

                    pageToken = page.NextPageToken;
                }
                while (page.HasMore && (!options.Max.HasValue || processed < options.Max.Value));

                await CompleteSyncStateIfNeeded(syncState, result, lastSourceTimestamp, options);
                return result;
            }
            catch (Exception ex)
            {
                result.ErrorCount++;
                result.Errors.Add(ex.Message);
                if (!options.DryRun)
                {
                    syncState.MarkCompleted(ExternalImportStatus.Failed, DateTime.UtcNow, ToCounters(result), result.Warnings, ex.Message, null, ImportUser);
                    await _syncStates.InsertOrReplace(syncState);
                }
                return result;
            }
        }

        public async Task<ExternalImportResult> ImportSupportTempoWorklogsAsync(ExternalImportOptions options)
        {
            options = NormalizeOptions(options);
            var source = ExternalImportSource.TempoWorklogs;
            var syncState = await GetSyncState(source);
            var result = CreateResult(source, options, syncState);
            var startedAt = DateTime.UtcNow;

            try
            {
                if (!options.DryRun)
                {
                    syncState.MarkRunning(options.Mode, startedAt, ImportUser);
                    await _syncStates.InsertOrReplace(syncState);
                }

                var updatedSince = GetWorklogUpdatedSince(options, syncState);
                var workItems = await _workItems.Get(x => x.Origin == WorkItemOrigin.Jira);
                var employees = await _employees.Get(x => true);
                var projects = await _projects.Get(x => true);
                var workItemsByCode = workItems
                    .Where(x => !string.IsNullOrWhiteSpace(x.Code))
                    .GroupBy(x => NormalizeComparable(x.Code))
                    .ToDictionary(x => x.Key, x => x.First());
                var workItemsByIssueId = workItems
                    .Where(x => !string.IsNullOrWhiteSpace(x.Jira?.IssueId))
                    .GroupBy(x => NormalizeComparable(x.Jira.IssueId))
                    .ToDictionary(x => x.Key, x => x.First());
                var employeesByEmail = employees
                    .Where(x => !string.IsNullOrWhiteSpace(x.Email))
                    .GroupBy(x => NormalizeComparable(x.Email))
                    .ToDictionary(x => x.Key, x => x.First());
                var projectsById = projects.ToDictionary(x => x.Id);
                var jiraUsersByAccountId = new Dictionary<string, ExternalImportPersonDto>();

                var importableWorkItems = workItems
                    .Where(x => !string.IsNullOrWhiteSpace(x.Jira?.IssueId))
                    .OrderBy(x => x.Code)
                    .ToList();
                DateTime? lastSourceTimestamp = null;
                var processed = 0;
                var pageSize = PageSize(options);

                foreach (var workItem in importableWorkItems)
                {
                    if (options.Max.HasValue && processed >= options.Max.Value)
                        break;
                    if (!string.IsNullOrWhiteSpace(options.IssueKey) && !string.Equals(workItem.Code, options.IssueKey, StringComparison.OrdinalIgnoreCase))
                        continue;

                    var pageToken = (string)null;
                    ExternalImportPage<TempoWorklogImportDto> page;
                    do
                    {
                        if (options.Max.HasValue && processed >= options.Max.Value)
                            break;

                        var remaining = options.Max.HasValue ? options.Max.Value - processed : pageSize;
                        page = await _tempoApiClient.GetIssueWorklogsAsync(workItem.Jira.IssueId, updatedSince, options.Since, Math.Min(pageSize, remaining), pageToken);
                        AppendRateLimitSummary(result, page.RateLimitSummary);
                        foreach (var worklog in page.Items)
                        {
                            if (options.Max.HasValue && processed >= options.Max.Value)
                                break;

                            if (string.IsNullOrWhiteSpace(worklog.IssueId))
                                worklog.IssueId = workItem.Jira.IssueId;
                            if (string.IsNullOrWhiteSpace(worklog.IssueKey))
                                worklog.IssueKey = workItem.Code;

                            result.TotalFetched++;
                            processed++;
                            lastSourceTimestamp = Max(lastSourceTimestamp, worklog.UpdatedAt ?? worklog.StartedAt);
                            await ImportWorklogAsync(worklog, workItemsByCode, workItemsByIssueId, employeesByEmail, projectsById, jiraUsersByAccountId, options, result);
                        }

                        pageToken = page.NextPageToken;
                    }
                    while (page.HasMore && (!options.Max.HasValue || processed < options.Max.Value));
                }

                await CompleteSyncStateIfNeeded(syncState, result, lastSourceTimestamp, options);
                return result;
            }
            catch (Exception ex)
            {
                result.ErrorCount++;
                result.Errors.Add(ex.Message);
                if (!options.DryRun)
                {
                    syncState.MarkCompleted(ExternalImportStatus.Failed, DateTime.UtcNow, ToCounters(result), result.Warnings, ex.Message, null, ImportUser);
                    await _syncStates.InsertOrReplace(syncState);
                }
                return result;
            }
        }

        private async Task ImportIssueAsync(JiraIssueImportDto issue, List<Customer> customers, List<Project> defaultProjects, List<Employee> employees, Dictionary<string, StatusConfig> statusByName, StatusConfig fallbackStatus, ExternalImportOptions options, ExternalImportResult result)
        {
            var issueWarnings = new List<string>();
            var reporterDomain = ResolveCustomerDomain(issue, issueWarnings);
            if (ShouldSkipOrganizationFallback(issue))
            {
                Skip(result, result.UnknownCustomers, $"{issue.IssueKey}: skipped by Jira organization fallback rule.");
                return;
            }
            var customer = customers.FirstOrDefault(x => DomainMatches(x.CompanyDomain, reporterDomain));
            if (customer == null)
            {
                Skip(result, result.UnknownCustomers, $"{issue.IssueKey}: reporter domain '{reporterDomain ?? "(missing)"}' did not match a customer.");
                return;
            }

            var project = defaultProjects.FirstOrDefault(x => x.CustomerId == customer.Id);
            if (project == null)
            {
                Skip(result, result.MissingDefaultProjects, $"{issue.IssueKey}: customer '{customer.CompanyName}' has no default project.");
                return;
            }

            var status = ResolveStatus(issue, statusByName, fallbackStatus, result, issueWarnings);
            var priority = MapPriority(issue.PriorityName, issueWarnings);
            NormalizePersonEmail(issue.Assignee);
            var assignee = FindEmployee(employees, issue.Assignee?.Email);
            if (issue.Assignee != null && assignee == null)
            {
                if (!options.DryRun)
                    assignee = await CreateDisabledEmployeeForLegacyStudioEmailAsync(issue.Assignee, employees, issueWarnings, issue.IssueKey);
                if (assignee == null)
                    issueWarnings.Add($"{issue.IssueKey}: assignee '{issue.Assignee.Email ?? issue.Assignee.DisplayName}' was not found; WorkItem left unassigned.");
            }
            if (issue.DescriptionUsedFallback)
                issueWarnings.Add($"{issue.IssueKey}: Jira description used fallback conversion.");

            var existing = await FindExistingWorkItem(issue);
            if (options.DryRun)
            {
                if (existing == null)
                    result.CreatedCount++;
                else
                    result.UpdatedCount++;
                AddWarnings(result, issueWarnings);
                return;
            }

            var metadata = MapWorkItemMetadata(issue, reporterDomain, issueWarnings);
            var closingDate = status.IsClosed() ? issue.ResolvedAt : null;
            var externalReference = string.IsNullOrWhiteSpace(issue.IssueSelfUrl) ? issue.IssueKey : issue.IssueSelfUrl;
            if (existing == null)
            {
                var workItem = new WorkItem(issue.IssueKey, project.Id, issue.Summary, issue.DescriptionHtml, status.Key, priority, assignee?.Email, issue.Reporter?.Email, WorkItemOrigin.Jira, externalReference, issue.CreatedAt, false, ImportUser);
                workItem.UpdateFromJiraImport(issue.IssueKey, project.Id, issue.Summary, issue.DescriptionHtml, status.Key, priority, assignee?.Email, issue.Reporter?.Email, externalReference, issue.CreatedAt, closingDate, metadata, ImportUser);
                await _workItems.InsertAsync(workItem);
                result.CreatedCount++;
            }
            else
            {
                existing.UpdateFromJiraImport(issue.IssueKey, project.Id, issue.Summary, issue.DescriptionHtml, status.Key, priority, assignee?.Email, issue.Reporter?.Email, externalReference, issue.CreatedAt, closingDate, metadata, ImportUser);
                await _workItems.InsertOrReplace(existing);
                result.UpdatedCount++;
            }

            AddWarnings(result, issueWarnings);
        }

        private async Task ImportWorklogAsync(TempoWorklogImportDto worklog, Dictionary<string, WorkItem> workItemsByCode, Dictionary<string, WorkItem> workItemsByIssueId, Dictionary<string, Employee> employeesByEmail, Dictionary<Guid, Project> projectsById, Dictionary<string, ExternalImportPersonDto> jiraUsersByAccountId, ExternalImportOptions options, ExternalImportResult result)
        {
            var issueKey = NormalizeComparable(worklog.IssueKey);
            var issueId = NormalizeComparable(worklog.IssueId);
            WorkItem workItem = null;
            if (issueKey != null)
                workItemsByCode.TryGetValue(issueKey, out workItem);
            if (workItem == null && issueId != null)
                workItemsByIssueId.TryGetValue(issueId, out workItem);
            if (workItem == null)
            {
                var issueLabel = !string.IsNullOrWhiteSpace(worklog.IssueKey) ? worklog.IssueKey : !string.IsNullOrWhiteSpace(worklog.IssueId) ? string.Concat("issue id ", worklog.IssueId) : "no issue";
                Skip(result, result.Warnings, $"{issueLabel}: WorkItem not found for worklog {WorklogLabel(worklog)}.");
                return;
            }
            if (string.IsNullOrWhiteSpace(worklog.IssueKey))
                worklog.IssueKey = workItem.Code;

            var author = await ResolveTempoAuthorAsync(worklog, jiraUsersByAccountId);
            NormalizePersonEmail(author);
            var authorEmail = author?.Email;
            Employee employee = null;
            if (!string.IsNullOrWhiteSpace(authorEmail))
                employeesByEmail.TryGetValue(NormalizeComparable(authorEmail), out employee);
            if (employee == null)
            {
                if (!options.DryRun)
                {
                    employee = await CreateDisabledEmployeeForLegacyStudioEmailAsync(author, employeesByEmail.Values.ToList(), result.Warnings, worklog.IssueKey);
                    if (employee != null)
                        employeesByEmail[NormalizeComparable(employee.Email)] = employee;
                }

                if (employee == null)
                {
                    Skip(result, result.MissingEmployees, $"{worklog.IssueKey}: employee '{authorEmail ?? "(missing)"}' not found for worklog {WorklogLabel(worklog)}.");
                    return;
                }
            }

            if (!projectsById.TryGetValue(workItem.ProjectId, out var project))
            {
                Skip(result, result.Errors, $"{worklog.IssueKey}: project not found for WorkItem.");
                result.ErrorCount++;
                return;
            }

            var time = SecondsToHours(worklog.TimeSpentSeconds);
            if (time <= 0)
            {
                Skip(result, result.Warnings, $"{worklog.IssueKey}: worklog {WorklogLabel(worklog)} has non-positive time and was skipped.");
                return;
            }
            var projectRateSnapshot = GetProjectRateSnapshot(project, employee.Level);
            var existing = await FindExistingTimeEntry(worklog);
            if (options.DryRun)
            {
                if (existing == null)
                    result.CreatedCount++;
                else
                    result.UpdatedCount++;
                return;
            }

            var metadata = MapTimeEntryMetadata(worklog);
            if (existing == null)
            {
                var timeEntry = new TimeEntry(employee.Id, workItem.Id, workItem.ProjectId, worklog.StartedAt, time, time, worklog.Description, null, RequestStatus.PendingApproval, null, employee.Level, employee.DefaultHourlyRate, projectRateSnapshot, ImportUser);
                timeEntry.UpdateFromJiraImport(employee.Id, workItem.Id, workItem.ProjectId, worklog.StartedAt, time, worklog.Description, null, employee.Level, employee.DefaultHourlyRate, projectRateSnapshot, metadata, ImportUser);
                await _timeEntries.InsertAsync(timeEntry);
                result.CreatedCount++;
            }
            else
            {
                existing.UpdateFromJiraImport(employee.Id, workItem.Id, workItem.ProjectId, worklog.StartedAt, time, worklog.Description, existing.Notes, employee.Level, employee.DefaultHourlyRate, projectRateSnapshot, metadata, ImportUser);
                await _timeEntries.InsertOrReplace(existing);
                result.UpdatedCount++;
            }
        }

        private async Task<WorkItem> FindExistingWorkItem(JiraIssueImportDto issue)
        {
            var byCode = await _workItems.GetSingleOrDefaultAsync(x => x.Code == issue.IssueKey);
            if (byCode != null)
                return byCode;
            if (string.IsNullOrWhiteSpace(issue.IssueId))
                return null;
            return await _workItems.GetSingleOrDefaultAsync(x => x.Jira != null && x.Jira.IssueId == issue.IssueId);
        }

        private async Task<TimeEntry> FindExistingTimeEntry(TempoWorklogImportDto worklog)
        {
            if (!string.IsNullOrWhiteSpace(worklog.TempoWorklogId))
            {
                var byTempo = await _timeEntries.GetSingleOrDefaultAsync(x => x.Jira != null && x.Jira.TempoWorklogId == worklog.TempoWorklogId);
                if (byTempo != null)
                    return byTempo;
            }

            if (!string.IsNullOrWhiteSpace(worklog.JiraWorklogId))
            {
                var byJira = await _timeEntries.GetSingleOrDefaultAsync(x => x.Jira != null && x.Jira.JiraWorklogId == worklog.JiraWorklogId);
                if (byJira != null)
                    return byJira;
            }

            var seconds = worklog.TimeSpentSeconds;
            var authorEmail = worklog.Author?.Email;
            return await _timeEntries.GetSingleOrDefaultAsync(x => x.Jira != null
                && x.Jira.IssueKey == worklog.IssueKey
                && x.Jira.AuthorEmail == authorEmail
                && x.Jira.StartedAt == worklog.StartedAt
                && x.Jira.TimeSpentSeconds == seconds);
        }

        private async Task<ExternalImportSyncState> GetSyncState(ExternalImportSource source)
        {
            var existing = await _syncStates.GetSingleOrDefaultAsync(x => x.Source == source && x.ProjectKey == ProjectKey);
            return existing ?? new ExternalImportSyncState(source, ProjectKey, ImportUser);
        }

        private async Task CompleteSyncStateIfNeeded(ExternalImportSyncState syncState, ExternalImportResult result, DateTime? lastSourceTimestamp, ExternalImportOptions options)
        {
            if (options.DryRun)
                return;

            var status = result.Errors.Any()
                ? ExternalImportStatus.Failed
                : result.HasWarnings
                    ? ExternalImportStatus.SucceededWithWarnings
                    : ExternalImportStatus.Succeeded;
            syncState.MarkCompleted(status, DateTime.UtcNow, ToCounters(result), AllWarnings(result), result.Errors.FirstOrDefault(), lastSourceTimestamp, ImportUser);
            await _syncStates.InsertOrReplace(syncState);
            result.NewLastSuccessfulSync = syncState.LastSuccessfulSyncAt;
        }

        private static ExternalImportResult CreateResult(ExternalImportSource source, ExternalImportOptions options, ExternalImportSyncState syncState)
        {
            return new ExternalImportResult
            {
                Source = source,
                ProjectKey = ProjectKey,
                Mode = options.Mode,
                DryRun = options.DryRun,
                PreviousLastSuccessfulSync = syncState.LastSuccessfulSyncAt
            };
        }

        private static ExternalImportOptions NormalizeOptions(ExternalImportOptions options)
        {
            options = options ?? new ExternalImportOptions();
            if (options.Max.HasValue && options.Max.Value <= 0)
                options.Max = null;
            if (!string.IsNullOrWhiteSpace(options.IssueKey))
                options.IssueKey = options.IssueKey.Trim().ToUpperInvariant();
            return options;
        }

        private static DateTime? GetIssueUpdatedSince(ExternalImportOptions options, ExternalImportSyncState syncState)
        {
            if (options.Since.HasValue)
                return options.Since.Value.Date;
            if (options.Mode != ExternalImportMode.UpdateOnly)
                return null;
            return syncState.LastIssueUpdatedAtImported ?? syncState.LastSuccessfulSyncAt;
        }

        private static DateTime? GetWorklogUpdatedSince(ExternalImportOptions options, ExternalImportSyncState syncState)
        {
            if (options.Since.HasValue)
                return options.Since.Value.Date;
            if (options.Mode != ExternalImportMode.UpdateOnly)
                return null;
            return syncState.LastWorklogUpdatedAtImported ?? syncState.LastSuccessfulSyncAt;
        }

        private static int PageSize(ExternalImportOptions options)
        {
            return options.Max.HasValue ? Math.Min(DefaultPageSize, options.Max.Value) : DefaultPageSize;
        }

        private static StatusConfig ResolveStatus(JiraIssueImportDto issue, Dictionary<string, StatusConfig> statusByName, StatusConfig fallbackStatus, ExternalImportResult result, List<string> issueWarnings)
        {
            if (!string.IsNullOrWhiteSpace(issue.StatusName) && statusByName.TryGetValue(NormalizeComparable(issue.StatusName), out var status))
                return status;

            var warning = $"{issue.IssueKey}: Jira status '{issue.StatusName ?? "(missing)"}' not mapped; fallback '{FallbackStatusKey}' used.";
            result.UnmappedStatuses.Add(warning);
            issueWarnings.Add(warning);
            return fallbackStatus;
        }

        private static WorkItemPriority MapPriority(string priorityName, List<string> warnings)
        {
            var value = NormalizeComparable(priorityName);
            if (value == "highest" || value == "critical" || value == "blocker")
                return WorkItemPriority.Urgent;
            if (value == "high" || value == "major")
                return WorkItemPriority.High;
            if (value == "low" || value == "lowest" || value == "minor")
                return WorkItemPriority.Low;
            if (value == "medium" || value == "normal" || string.IsNullOrWhiteSpace(value))
                return WorkItemPriority.Normal;

            warnings.Add($"Priority '{priorityName}' not mapped; Normal used.");
            return WorkItemPriority.Normal;
        }

        private static WorkItemJiraMetadata MapWorkItemMetadata(JiraIssueImportDto issue, string reporterDomain, List<string> warnings)
        {
            return new WorkItemJiraMetadata
            {
                IssueId = issue.IssueId,
                IssueKey = issue.IssueKey,
                IssueSelfUrl = issue.IssueSelfUrl,
                ProjectKey = issue.ProjectKey,
                IssueType = issue.IssueType,
                StatusName = issue.StatusName,
                StatusId = issue.StatusId,
                StatusCategory = issue.StatusCategory,
                PriorityName = issue.PriorityName,
                PriorityId = issue.PriorityId,
                ReporterAccountId = issue.Reporter?.AccountId,
                ReporterDisplayName = issue.Reporter?.DisplayName,
                ReporterEmail = issue.Reporter?.Email,
                ReporterPortalCustomerFullName = issue.Reporter?.PortalCustomerFullName,
                ReporterPortalCustomerActive = issue.Reporter?.PortalCustomerActive,
                ReporterPortalCustomerLastLogin = issue.Reporter?.PortalCustomerLastLogin,
                ReporterPortalCustomerMatchedFromCsv = issue.Reporter?.PortalCustomerMatchedFromCsv == true,
                AssigneeAccountId = issue.Assignee?.AccountId,
                AssigneeDisplayName = issue.Assignee?.DisplayName,
                AssigneeEmail = issue.Assignee?.Email,
                AssigneePortalCustomerFullName = issue.Assignee?.PortalCustomerFullName,
                AssigneePortalCustomerActive = issue.Assignee?.PortalCustomerActive,
                AssigneePortalCustomerLastLogin = issue.Assignee?.PortalCustomerLastLogin,
                AssigneePortalCustomerMatchedFromCsv = issue.Assignee?.PortalCustomerMatchedFromCsv == true,
                RequestParticipants = issue.RequestParticipants.Select(x => new JiraParticipantInfo { AccountId = x.AccountId, DisplayName = x.DisplayName, Email = x.Email, PortalCustomerFullName = x.PortalCustomerFullName, PortalCustomerActive = x.PortalCustomerActive, PortalCustomerLastLogin = x.PortalCustomerLastLogin, PortalCustomerMatchedFromCsv = x.PortalCustomerMatchedFromCsv }).ToList(),
                Organizations = issue.Organizations.Select(x => new JiraOrganizationInfo { Id = x.Id, Name = x.Name }).ToList(),
                CustomerDomainDetected = reporterDomain,
                ImportedAt = DateTime.UtcNow,
                LastSeenAt = DateTime.UtcNow,
                RawCreatedAt = issue.CreatedAt,
                RawUpdatedAt = issue.UpdatedAt,
                ImportWarnings = warnings.ToList(),
                RawFieldsJson = issue.RawFieldsJson
            };
        }

        private static TimeEntryJiraMetadata MapTimeEntryMetadata(TempoWorklogImportDto worklog)
        {
            return new TimeEntryJiraMetadata
            {
                TempoWorklogId = worklog.TempoWorklogId,
                JiraWorklogId = worklog.JiraWorklogId,
                IssueId = worklog.IssueId,
                IssueKey = worklog.IssueKey,
                AuthorAccountId = worklog.Author?.AccountId,
                AuthorDisplayName = worklog.Author?.DisplayName,
                AuthorEmail = worklog.Author?.Email,
                StartedAt = worklog.StartedAt,
                UpdatedAt = worklog.UpdatedAt,
                TimeSpentSeconds = worklog.TimeSpentSeconds,
                ImportedAt = DateTime.UtcNow,
                LastSeenAt = DateTime.UtcNow,
                RawFieldsJson = worklog.RawFieldsJson
            };
        }

        private static Employee FindEmployee(List<Employee> employees, string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return null;
            return employees.FirstOrDefault(x => string.Equals(x.Email, email.Trim(), StringComparison.OrdinalIgnoreCase));
        }

        private async Task<ExternalImportPersonDto> ResolveTempoAuthorAsync(TempoWorklogImportDto worklog, Dictionary<string, ExternalImportPersonDto> jiraUsersByAccountId)
        {
            if (worklog.Author == null || !string.IsNullOrWhiteSpace(worklog.Author.Email))
                return worklog.Author;
            if (string.IsNullOrWhiteSpace(worklog.Author.AccountId))
                return worklog.Author;

            var accountId = worklog.Author.AccountId.Trim();
            if (!jiraUsersByAccountId.TryGetValue(accountId, out var jiraUser))
            {
                jiraUser = await _jiraApiClient.GetUserAsync(accountId);
                jiraUsersByAccountId[accountId] = jiraUser;
            }

            if (jiraUser == null)
                return worklog.Author;

            worklog.Author = jiraUser;
            return jiraUser;
        }

        private async Task<Employee> CreateDisabledEmployeeForLegacyStudioEmailAsync(ExternalImportPersonDto person, List<Employee> employees, List<string> warnings, string issueKey)
        {
            var email = NormalizeImportEmail(person?.Email);
            if (!IsStudioCassolatoEmail(email))
                return null;

            var existing = FindEmployee(employees, email);
            if (existing != null)
                return existing;

            var name = SplitPersonName(person?.DisplayName, email);
            var employee = new Employee(name.FirstName, name.LastName, email, EmployeeLevel.Mid, 1m, 8m, ImportUser);
            employee.Update(employee.FirstName, employee.LastName, employee.Email, employee.Level, employee.DefaultHourlyRate, employee.ExpectedDailyHours, false, ImportUser);
            await _employees.InsertAsync(employee);
            employees.Add(employee);
            warnings.Add($"{issueKey}: disabled employee '{email}' created for legacy Studio Cassolato import identity.");
            return employee;
        }

        private static string ResolveCustomerDomain(JiraIssueImportDto issue, List<string> warnings)
        {
            var reporterDomain = NormalizeCustomerDomain(ExtractDomain(issue.Reporter?.Email));
            if (!string.IsNullOrWhiteSpace(reporterDomain))
                return reporterDomain;

            var issueKey = NormalizeComparable(issue?.IssueKey);
            if (issueKey == NormalizeComparable(Support1658IssueKey))
            {
                warnings.Add($"{issue.IssueKey}: customer domain resolved from explicit issue fallback '{AthenaDomain}'.");
                return AthenaDomain;
            }

            var organizationDomain = ResolveCustomerDomainFromOrganization(issue);
            if (!string.IsNullOrWhiteSpace(organizationDomain))
            {
                var organization = issue.Organizations.FirstOrDefault(x => string.Equals(NormalizeCustomerDomainFromOrganization(x), organizationDomain, StringComparison.OrdinalIgnoreCase));
                var organizationLabel = string.IsNullOrWhiteSpace(organization?.Name) ? organization?.Id : organization.Name;
                warnings.Add($"{issue.IssueKey}: customer domain resolved from Jira organization '{organizationLabel}' as '{organizationDomain}'.");
                return organizationDomain;
            }

            return null;
        }

        private static bool ShouldSkipOrganizationFallback(JiraIssueImportDto issue)
        {
            return string.Equals(issue?.IssueKey, SkipOrganizationFallbackIssueKey, StringComparison.OrdinalIgnoreCase);
        }

        private static string ResolveCustomerDomainFromOrganization(JiraIssueImportDto issue)
        {
            if (issue?.Organizations == null)
                return null;

            return issue.Organizations
                .Select(NormalizeCustomerDomainFromOrganization)
                .FirstOrDefault(x => !string.IsNullOrWhiteSpace(x));
        }

        private static string NormalizeCustomerDomainFromOrganization(ExternalImportOrganizationDto organization)
        {
            if (organization == null)
                return null;

            var organizationId = NormalizeComparable(organization.Id);
            if (organizationId == AthenaOrganizationId)
                return AthenaDomain;
            if (organizationId == VitecgroupOrganizationId)
                return VidendumDomain;

            var organizationName = NormalizeComparable(organization.Name);
            if (organizationName == "athena")
                return AthenaDomain;
            if (organizationName == "vitecgroup")
                return VidendumDomain;

            return null;
        }

        private static bool DomainMatches(string companyDomain, string reporterDomain)
        {
            if (string.IsNullOrWhiteSpace(companyDomain) || string.IsNullOrWhiteSpace(reporterDomain))
                return false;
            var domains = companyDomain.Split(new[] { ';', ',', ' ' }, StringSplitOptions.RemoveEmptyEntries);
            return domains.Any(x => string.Equals(NormalizeCustomerDomain(x), NormalizeCustomerDomain(reporterDomain), StringComparison.OrdinalIgnoreCase));
        }

        private static string ExtractDomain(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return null;
            var at = email.LastIndexOf('@');
            return at < 0 || at == email.Length - 1 ? null : email.Substring(at + 1).Trim().ToLowerInvariant();
        }

        private static string NormalizeCustomerDomain(string domain)
        {
            var value = NormalizeComparable(domain);
            return value == "vitecgroup.com" || value == "imaginars.com" ? "videndum.com" : value;
        }

        private static void NormalizePersonEmail(ExternalImportPersonDto person)
        {
            if (person == null)
                return;
            person.Email = NormalizeImportEmail(person.Email);
        }

        private static string NormalizeImportEmail(string email)
        {
            var value = NormalizeEmail(email);
            return string.Equals(value, LegacyMassimilianoZanatoEmail, StringComparison.OrdinalIgnoreCase)
                ? StudioMassimilianoZanatoEmail
                : value;
        }

        private static string NormalizeEmail(string email)
        {
            return string.IsNullOrWhiteSpace(email) ? null : email.Trim().ToLowerInvariant();
        }

        private static bool IsStudioCassolatoEmail(string email)
        {
            return string.Equals(ExtractDomain(email), StudioCassolatoDomain, StringComparison.OrdinalIgnoreCase);
        }

        private static (string FirstName, string LastName) SplitPersonName(string displayName, string email)
        {
            var value = string.IsNullOrWhiteSpace(displayName) ? EmailLocalPart(email) : displayName.Trim();
            var parts = value.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length >= 2)
                return (parts[0], string.Join(" ", parts.Skip(1)));

            var fallback = string.IsNullOrWhiteSpace(value) ? "Legacy" : value;
            return (fallback, "Imported");
        }

        private static string EmailLocalPart(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return "Legacy";
            var at = email.IndexOf('@');
            var localPart = at > 0 ? email.Substring(0, at) : email;
            var words = localPart.Replace('.', ' ').Replace('_', ' ').Replace('-', ' ');
            return string.IsNullOrWhiteSpace(words) ? "Legacy" : words.Trim();
        }

        private static decimal SecondsToHours(int seconds)
        {
            return Math.Round(seconds / 3600m, 4);
        }

        private static decimal GetProjectRateSnapshot(Project project, EmployeeLevel level)
        {
            if (project.PaymentType != ProjectPaymentType.TimeAndMaterial)
                return 0;
            if (level == EmployeeLevel.Junior)
                return project.JuniorRate.GetValueOrDefault();
            if (level == EmployeeLevel.Mid)
                return project.MidRate.GetValueOrDefault();
            return project.SeniorRate.GetValueOrDefault();
        }

        private static string NormalizeComparable(string value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim().ToLowerInvariant();
        }

        private static DateTime? Max(DateTime? current, DateTime? candidate)
        {
            if (!candidate.HasValue)
                return current;
            if (!current.HasValue || candidate.Value > current.Value)
                return candidate.Value;
            return current;
        }

        private static void Skip(ExternalImportResult result, List<string> bucket, string message)
        {
            result.SkippedCount++;
            bucket.Add(message);
            result.Warnings.Add(message);
        }

        private static void AddWarnings(ExternalImportResult result, List<string> warnings)
        {
            foreach (var warning in warnings)
                result.Warnings.Add(warning);
        }

        private static IEnumerable<string> AllWarnings(ExternalImportResult result)
        {
            return result.Warnings
                .Concat(result.UnmappedStatuses)
                .Concat(result.UnknownCustomers)
                .Concat(result.MissingDefaultProjects)
                .Concat(result.MissingEmployees)
                .Distinct()
                .ToList();
        }

        private static ExternalImportCounters ToCounters(ExternalImportResult result)
        {
            return new ExternalImportCounters
            {
                TotalFetched = result.TotalFetched,
                CreatedCount = result.CreatedCount,
                UpdatedCount = result.UpdatedCount,
                SkippedCount = result.SkippedCount,
                ErrorCount = result.ErrorCount
            };
        }

        private static void AppendRateLimitSummary(ExternalImportResult result, string summary)
        {
            if (string.IsNullOrWhiteSpace(summary))
                return;
            result.RateLimitSummary = string.IsNullOrWhiteSpace(result.RateLimitSummary)
                ? summary
                : string.Concat(result.RateLimitSummary, " ", summary);
        }

        private static string WorklogLabel(TempoWorklogImportDto worklog)
        {
            return !string.IsNullOrWhiteSpace(worklog.TempoWorklogId)
                ? worklog.TempoWorklogId
                : !string.IsNullOrWhiteSpace(worklog.JiraWorklogId) ? worklog.JiraWorklogId : "(no id)";
        }

    }
}
