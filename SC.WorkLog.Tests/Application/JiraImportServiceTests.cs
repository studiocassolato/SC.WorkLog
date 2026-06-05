#nullable disable

using SC.WorkLog.Application.DTO.ExternalImport;
using SC.WorkLog.Application.Services.ExternalImport;
using SC.WorkLog.Domain.AggregateRoots;
using SC.WorkLog.Domain.Enums;
using SC.WorkLog.Infrastructure.ExternalImport;

namespace SC.WorkLog.Tests.Application;

public class JiraImportServiceTests
{
    [Fact]
    public async Task ImportSupportIssuesAsync_CreatesWorkItemFromJiraIssue()
    {
        var context = CreateContext();
        var jira = new FakeJiraApiClient(Issue(statusName: "in progress", priorityName: "High", descriptionHtml: "<p>Hello</p>"));
        var service = CreateService(context, jira);

        var result = await service.ImportSupportIssuesAsync(new ExternalImportOptions());

        var item = Assert.Single(context.WorkItems.Items);
        Assert.Equal(1, result.CreatedCount);
        Assert.Equal("SUPPORT-1234", item.Code);
        Assert.Equal("Imported issue", item.Title);
        Assert.Equal("<p>Hello</p>", item.Description);
        Assert.Equal(WorkItemOrigin.Jira, item.Origin);
        Assert.Equal(WorkItemPriority.High, item.Priority);
        Assert.Equal(context.Employee.Email, item.AssigneeId);
        Assert.Equal("reporter@example.com", item.Reporter);
        Assert.Equal(context.Project.Id, item.ProjectId);
        Assert.Equal("jira-1234", item.Jira.IssueId);
        Assert.Equal("example.com", item.Jira.CustomerDomainDetected);
    }

    [Fact]
    public async Task ImportSupportIssuesAsync_DoesNotDuplicateAndUpdatesExistingByIssueKey()
    {
        var context = CreateContext();
        context.WorkItems.Items.Add(new WorkItem("SUPPORT-1234", context.Project.Id, "Old", "Old", "new", WorkItemPriority.Low, null, "reporter@example.com", WorkItemOrigin.Jira, "old", DateTime.Today.AddDays(-2), false, "test"));
        var jira = new FakeJiraApiClient(Issue(summary: "Updated title", statusName: "In progress", priorityName: "Highest"));
        var service = CreateService(context, jira);

        var result = await service.ImportSupportIssuesAsync(new ExternalImportOptions());

        var item = Assert.Single(context.WorkItems.Items);
        Assert.Equal(0, result.CreatedCount);
        Assert.Equal(1, result.UpdatedCount);
        Assert.Equal("Updated title", item.Title);
        Assert.Equal(WorkItemPriority.Urgent, item.Priority);
    }

    [Fact]
    public async Task ImportSupportIssuesAsync_FallsBackWhenStatusNameIsUnmapped()
    {
        var context = CreateContext();
        var jira = new FakeJiraApiClient(Issue(statusName: "Waiting for Vendor"));
        var service = CreateService(context, jira);

        var result = await service.ImportSupportIssuesAsync(new ExternalImportOptions());

        var item = Assert.Single(context.WorkItems.Items);
        Assert.Equal("in-progress", item.StatusKey);
        Assert.Contains(result.UnmappedStatuses, warning => warning.Contains("Waiting for Vendor"));
        Assert.Contains(item.Jira.ImportWarnings, warning => warning.Contains("fallback"));
    }

    [Fact]
    public async Task ImportSupportIssuesAsync_RequiresCustomerAndDefaultProject()
    {
        var context = CreateContext();
        context.Projects.Items.Clear();
        var jira = new FakeJiraApiClient(Issue());
        var service = CreateService(context, jira);

        var missingDefault = await service.ImportSupportIssuesAsync(new ExternalImportOptions());
        context.Customers.Items.Clear();
        var missingCustomer = await service.ImportSupportIssuesAsync(new ExternalImportOptions());

        Assert.Empty(context.WorkItems.Items);
        Assert.Equal(1, missingDefault.SkippedCount);
        Assert.Single(missingDefault.MissingDefaultProjects);
        Assert.Single(missingCustomer.UnknownCustomers);
    }

    [Fact]
    public async Task ImportSupportIssuesAsync_TreatsVitecgroupDomainAsVidendum()
    {
        var context = CreateContext();
        var videndum = new Customer("Videndum", "videndum.com", "Reporter", "reporter@videndum.com", null, "test");
        var videndumProject = new Project(videndum.Id, "Videndum support", ProjectPaymentType.TimeAndMaterial, ProjectStatus.Active, null, 50m, 75m, 100m, null, "test", true);
        context.Customers.Items.Add(videndum);
        context.Projects.Items.Add(videndumProject);
        var issue = Issue();
        issue.Reporter.Email = "reporter@vitecgroup.com";
        var service = CreateService(context, new FakeJiraApiClient(issue));

        var result = await service.ImportSupportIssuesAsync(new ExternalImportOptions());

        var item = Assert.Single(context.WorkItems.Items);
        Assert.Equal(1, result.CreatedCount);
        Assert.Equal(videndumProject.Id, item.ProjectId);
        Assert.Equal("videndum.com", item.Jira.CustomerDomainDetected);
    }

    [Fact]
    public async Task ImportSupportIssuesAsync_TreatsImaginarsDomainAsVidendum()
    {
        var context = CreateContext();
        var videndum = new Customer("Videndum", "videndum.com", "Reporter", "reporter@videndum.com", null, "test");
        var videndumProject = new Project(videndum.Id, "Videndum support", ProjectPaymentType.TimeAndMaterial, ProjectStatus.Active, null, 50m, 75m, 100m, null, "test", true);
        context.Customers.Items.Add(videndum);
        context.Projects.Items.Add(videndumProject);
        var issue = Issue();
        issue.Reporter.Email = "reporter@imaginars.com";
        var service = CreateService(context, new FakeJiraApiClient(issue));

        var result = await service.ImportSupportIssuesAsync(new ExternalImportOptions());

        var item = Assert.Single(context.WorkItems.Items);
        Assert.Equal(1, result.CreatedCount);
        Assert.Equal(videndumProject.Id, item.ProjectId);
        Assert.Equal("videndum.com", item.Jira.CustomerDomainDetected);
    }

    [Fact]
    public async Task ImportSupportIssuesAsync_MapsAthenaOrganizationWhenReporterDomainIsMissing()
    {
        var context = CreateContext();
        var athena = new Customer("Athena", "athena.eu", "Reporter", "reporter@athena.eu", null, "test");
        var athenaProject = new Project(athena.Id, "Athena support", ProjectPaymentType.TimeAndMaterial, ProjectStatus.Active, null, 50m, 75m, 100m, null, "test", true);
        context.Customers.Items.Add(athena);
        context.Projects.Items.Add(athenaProject);
        var issue = Issue();
        issue.Reporter.Email = null;
        issue.Organizations.Add(new ExternalImportOrganizationDto { Id = "7", Name = "Athena" });
        var service = CreateService(context, new FakeJiraApiClient(issue));

        var result = await service.ImportSupportIssuesAsync(new ExternalImportOptions());

        var item = Assert.Single(context.WorkItems.Items);
        Assert.Equal(1, result.CreatedCount);
        Assert.Equal(athenaProject.Id, item.ProjectId);
        Assert.Equal("athena.eu", item.Jira.CustomerDomainDetected);
        Assert.Contains(item.Jira.Organizations, organization => organization.Id == "7" && organization.Name == "Athena");
    }

    [Fact]
    public async Task ImportSupportIssuesAsync_MapsVitecgroupOrganizationToVidendumWhenReporterDomainIsMissing()
    {
        var context = CreateContext();
        var videndum = new Customer("Videndum", "videndum.com", "Reporter", "reporter@videndum.com", null, "test");
        var videndumProject = new Project(videndum.Id, "Videndum support", ProjectPaymentType.TimeAndMaterial, ProjectStatus.Active, null, 50m, 75m, 100m, null, "test", true);
        context.Customers.Items.Add(videndum);
        context.Projects.Items.Add(videndumProject);
        var issue = Issue();
        issue.Reporter.Email = null;
        issue.Organizations.Add(new ExternalImportOrganizationDto { Id = "6", Name = "Vitecgroup" });
        var service = CreateService(context, new FakeJiraApiClient(issue));

        var result = await service.ImportSupportIssuesAsync(new ExternalImportOptions());

        var item = Assert.Single(context.WorkItems.Items);
        Assert.Equal(1, result.CreatedCount);
        Assert.Equal(videndumProject.Id, item.ProjectId);
        Assert.Equal("videndum.com", item.Jira.CustomerDomainDetected);
    }

    [Fact]
    public async Task ImportSupportIssuesAsync_MapsSupport1658ToAthenaWithoutOrganization()
    {
        var context = CreateContext();
        var athena = new Customer("Athena", "athena.eu", "Reporter", "reporter@athena.eu", null, "test");
        var athenaProject = new Project(athena.Id, "Athena support", ProjectPaymentType.TimeAndMaterial, ProjectStatus.Active, null, 50m, 75m, 100m, null, "test", true);
        context.Customers.Items.Add(athena);
        context.Projects.Items.Add(athenaProject);
        var issue = Issue();
        issue.IssueKey = "SUPPORT-1658";
        issue.Reporter.Email = null;
        var service = CreateService(context, new FakeJiraApiClient(issue));

        var result = await service.ImportSupportIssuesAsync(new ExternalImportOptions());

        var item = Assert.Single(context.WorkItems.Items);
        Assert.Equal(1, result.CreatedCount);
        Assert.Equal(athenaProject.Id, item.ProjectId);
        Assert.Equal("athena.eu", item.Jira.CustomerDomainDetected);
    }

    [Fact]
    public async Task ImportSupportIssuesAsync_SkipsSupport607ByOrganizationFallbackRule()
    {
        var context = CreateContext();
        var issue = Issue();
        issue.IssueKey = "SUPPORT-607";
        issue.Reporter.Email = null;
        issue.Organizations.Add(new ExternalImportOrganizationDto { Id = "7", Name = "Athena" });
        var service = CreateService(context, new FakeJiraApiClient(issue));

        var result = await service.ImportSupportIssuesAsync(new ExternalImportOptions());

        Assert.Empty(context.WorkItems.Items);
        Assert.Equal(1, result.SkippedCount);
        Assert.Contains(result.UnknownCustomers, warning => warning.Contains("skipped by Jira organization fallback rule"));
    }

    [Fact]
    public async Task ImportSupportIssuesAsync_LeavesAssigneeNullWhenEmployeeNotFound()
    {
        var context = CreateContext();
        context.Employees.Items.Clear();
        var jira = new FakeJiraApiClient(Issue());
        var service = CreateService(context, jira);

        var result = await service.ImportSupportIssuesAsync(new ExternalImportOptions());

        var item = Assert.Single(context.WorkItems.Items);
        Assert.Null(item.AssigneeId);
        Assert.Contains(result.Warnings, warning => warning.Contains("assignee"));
    }

    [Fact]
    public async Task ImportSupportIssuesAsync_CreatesDisabledEmployeeForLegacyStudioAssignee()
    {
        var context = CreateContext();
        context.Employees.Items.Clear();
        var issue = Issue();
        issue.Assignee = new ExternalImportPersonDto { AccountId = "legacy-1", DisplayName = "Legacy User", Email = "legacy.user@studiocassolato.it" };
        var service = CreateService(context, new FakeJiraApiClient(issue));

        var result = await service.ImportSupportIssuesAsync(new ExternalImportOptions());

        var item = Assert.Single(context.WorkItems.Items);
        var employee = Assert.Single(context.Employees.Items);
        Assert.Equal(1, result.CreatedCount);
        Assert.Equal("legacy.user@studiocassolato.it", item.AssigneeId);
        Assert.False(employee.Active);
        Assert.Equal("Legacy", employee.FirstName);
        Assert.Equal("User", employee.LastName);
    }

    [Fact]
    public async Task ImportSupportTempoWorklogsAsync_CreatesTimeEntryAndDoesNotDuplicateByTempoId()
    {
        var context = CreateContext();
        context.WorkItems.Items.Add(ImportedWorkItem(context));
        var tempo = new FakeTempoApiClient(Worklog());
        var service = CreateService(context, tempoClient: tempo);

        var first = await service.ImportSupportTempoWorklogsAsync(new ExternalImportOptions());
        var second = await service.ImportSupportTempoWorklogsAsync(new ExternalImportOptions());

        var entry = Assert.Single(context.TimeEntries.Items);
        Assert.Equal(1, first.CreatedCount);
        Assert.Equal(1, second.UpdatedCount);
        Assert.Equal(context.WorkItems.Items.Single().Id, entry.WorkItemId);
        Assert.Equal(context.Project.Id, entry.ProjectId);
        Assert.Equal(1.25m, entry.Time);
        Assert.Equal(1.25m, entry.ApprovedTime);
        Assert.Equal("tempo-1", entry.Jira.TempoWorklogId);
    }

    [Fact]
    public async Task ImportSupportTempoWorklogsAsync_CreatesDisabledEmployeeForLegacyMassimilianoAlias()
    {
        var context = CreateContext();
        context.WorkItems.Items.Add(ImportedWorkItem(context));
        var worklog = Worklog();
        worklog.Author = new ExternalImportPersonDto { AccountId = "massimiliano-1", DisplayName = "Massimiliano Zanato", Email = "lab@massimilianozanato.com" };
        var service = CreateService(context, tempoClient: new FakeTempoApiClient(worklog));

        var result = await service.ImportSupportTempoWorklogsAsync(new ExternalImportOptions());

        var employee = Assert.Single(context.Employees.Items, x => x.Email == "massimiliano.zanato@studiocassolato.it");
        var entry = Assert.Single(context.TimeEntries.Items);
        Assert.Equal(1, result.CreatedCount);
        Assert.Equal(employee.Id, entry.EmployeeId);
        Assert.False(employee.Active);
        Assert.Equal("Massimiliano", employee.FirstName);
        Assert.Equal("Zanato", employee.LastName);
        Assert.Equal("massimiliano.zanato@studiocassolato.it", entry.Jira.AuthorEmail);
    }

    [Fact]
    public async Task ImportSupportTempoWorklogsAsync_SkipsMissingEmployeeAndMissingWorkItem()
    {
        var context = CreateContext();
        var service = CreateService(context, tempoClient: new FakeTempoApiClient(Worklog()));

        var missingWorkItem = await service.ImportSupportTempoWorklogsAsync(new ExternalImportOptions());
        context.WorkItems.Items.Add(ImportedWorkItem(context));
        context.Employees.Items.Clear();
        var missingEmployee = await service.ImportSupportTempoWorklogsAsync(new ExternalImportOptions());

        Assert.Empty(context.TimeEntries.Items);
        Assert.Equal(0, missingWorkItem.SkippedCount);
        Assert.Equal(0, missingWorkItem.TotalFetched);
        Assert.Equal(1, missingEmployee.SkippedCount);
        Assert.Single(missingEmployee.MissingEmployees);
    }

    [Fact]
    public async Task ImportSupportIssuesAsync_DryRunDoesNotWriteOrUpdateSyncState()
    {
        var context = CreateContext();
        var service = CreateService(context, new FakeJiraApiClient(Issue()));

        var result = await service.ImportSupportIssuesAsync(new ExternalImportOptions { DryRun = true });

        Assert.Equal(1, result.CreatedCount);
        Assert.Empty(context.WorkItems.Items);
        Assert.Empty(context.SyncStates.Items);
    }

    [Fact]
    public async Task ImportSupportIssuesAsync_UpdatesSyncStateAndUpdateOnlyUsesTimestamp()
    {
        var context = CreateContext();
        var jira = new FakeJiraApiClient(Issue(updatedAt: new DateTime(2026, 1, 3, 12, 0, 0, DateTimeKind.Utc)));
        var service = CreateService(context, jira);

        var first = await service.ImportSupportIssuesAsync(new ExternalImportOptions());
        var second = await service.ImportSupportIssuesAsync(new ExternalImportOptions { Mode = ExternalImportMode.UpdateOnly });

        var state = Assert.Single(context.SyncStates.Items);
        Assert.Equal(ExternalImportStatus.Succeeded, state.Status);
        Assert.NotNull(state.LastSuccessfulSyncAt);
        Assert.Equal(new DateTime(2026, 1, 3, 12, 0, 0, DateTimeKind.Utc), state.LastIssueUpdatedAtImported);
        Assert.NotNull(jira.LastUpdatedSince);
        Assert.Equal(first.NewLastSuccessfulSync, second.PreviousLastSuccessfulSync);
    }

    [Fact]
    public async Task ImportSupportIssuesAsync_FailureRecordsSyncStateFailure()
    {
        var context = CreateContext();
        var service = CreateService(context, new FakeJiraApiClient(new ArgumentException("boom")));

        var result = await service.ImportSupportIssuesAsync(new ExternalImportOptions());

        var state = Assert.Single(context.SyncStates.Items);
        Assert.Equal(1, result.ErrorCount);
        Assert.Equal(ExternalImportStatus.Failed, state.Status);
        Assert.Contains("boom", state.LastError);
    }

    [Fact]
    public async Task ImportSupportTempoWorklogsAsync_UpdateOnlyUsesSyncTimestamp()
    {
        var context = CreateContext();
        context.WorkItems.Items.Add(ImportedWorkItem(context));
        var tempo = new FakeTempoApiClient(Worklog(updatedAt: new DateTime(2026, 1, 5, 12, 0, 0, DateTimeKind.Utc)));
        var service = CreateService(context, tempoClient: tempo);

        await service.ImportSupportTempoWorklogsAsync(new ExternalImportOptions());
        await service.ImportSupportTempoWorklogsAsync(new ExternalImportOptions { Mode = ExternalImportMode.UpdateOnly });

        var state = Assert.Single(context.SyncStates.Items);
        Assert.Equal(new DateTime(2026, 1, 5, 12, 0, 0, DateTimeKind.Utc), state.LastWorklogUpdatedAtImported);
        Assert.NotNull(tempo.LastUpdatedSince);
    }

    private static TestContext CreateContext()
    {
        var context = new TestContext();
        context.Customer = new Customer("Example", "example.com", "Reporter", "reporter@example.com", null, "test");
        context.Project = new Project(context.Customer.Id, "Default support", ProjectPaymentType.TimeAndMaterial, ProjectStatus.Active, null, 50m, 75m, 100m, null, "test", true);
        context.Employee = new Employee("Ada", "Lovelace", "assignee@example.com", EmployeeLevel.Senior, 80m, 8m, "test");
        context.NewStatus = new StatusConfig("new", "New", WorkItemStatusTypology.New, "New", 10, true, "test");
        context.InProgressStatus = new StatusConfig("in-progress", "In Progress", WorkItemStatusTypology.InProgress, "In progress", 20, true, "test");
        context.ClosedStatus = new StatusConfig("closed", "Closed", WorkItemStatusTypology.Closed, "Closed", 90, true, "test");
        context.Customers.Items.Add(context.Customer);
        context.Projects.Items.Add(context.Project);
        context.Employees.Items.Add(context.Employee);
        context.StatusConfigs.Items.AddRange(new[] { context.NewStatus, context.InProgressStatus, context.ClosedStatus });
        context.WorkItem = ImportedWorkItem(context);
        return context;
    }

    private static JiraImportService CreateService(TestContext context, IJiraApiClient jiraClient = null, ITempoApiClient tempoClient = null)
    {
        return new JiraImportService(
            jiraClient ?? new FakeJiraApiClient(),
            tempoClient ?? new FakeTempoApiClient(),
            context.WorkItems,
            context.TimeEntries,
            context.Customers,
            context.Projects,
            context.Employees,
            context.StatusConfigs,
            context.SyncStates);
    }

    private static WorkItem ImportedWorkItem(TestContext context)
    {
        var item = new WorkItem("SUPPORT-1234", context.Project.Id, "Imported issue", "<p>Hello</p>", "in-progress", WorkItemPriority.Normal, context.Employee.Email, "reporter@example.com", WorkItemOrigin.Jira, "SUPPORT-1234", DateTime.Today, false, "test");
        item.UpdateFromJiraImport("SUPPORT-1234", context.Project.Id, "Imported issue", "<p>Hello</p>", "in-progress", WorkItemPriority.Normal, context.Employee.Email, "reporter@example.com", "SUPPORT-1234", DateTime.Today, null, new() { IssueId = "jira-1234", IssueKey = "SUPPORT-1234" }, "test");
        return item;
    }

    private static JiraIssueImportDto Issue(string summary = "Imported issue", string statusName = "In Progress", string priorityName = "Normal", string descriptionHtml = "<p>Hello</p>", DateTime? updatedAt = null)
    {
        return new JiraIssueImportDto
        {
            IssueId = "jira-1234",
            IssueKey = "SUPPORT-1234",
            IssueSelfUrl = "https://studiocassolato.atlassian.net/browse/SUPPORT-1234",
            ProjectKey = "SUPPORT",
            IssueType = "Service Request",
            StatusName = statusName,
            StatusId = "status-1",
            StatusCategory = "In Progress",
            PriorityName = priorityName,
            PriorityId = "priority-1",
            Summary = summary,
            DescriptionHtml = descriptionHtml,
            Reporter = new ExternalImportPersonDto { AccountId = "reporter-1", DisplayName = "Reporter", Email = "reporter@example.com" },
            Assignee = new ExternalImportPersonDto { AccountId = "assignee-1", DisplayName = "Ada Lovelace", Email = "assignee@example.com" },
            RequestParticipants = new() { new ExternalImportPersonDto { AccountId = "participant-1", DisplayName = "Participant", Email = "participant@example.com" } },
            CreatedAt = new DateTime(2026, 1, 1, 10, 0, 0, DateTimeKind.Utc),
            UpdatedAt = updatedAt ?? new DateTime(2026, 1, 2, 10, 0, 0, DateTimeKind.Utc),
            RawFieldsJson = "{}"
        };
    }

    private static TempoWorklogImportDto Worklog(DateTime? updatedAt = null)
    {
        return new TempoWorklogImportDto
        {
            TempoWorklogId = "tempo-1",
            JiraWorklogId = "jira-worklog-1",
            IssueId = "jira-1234",
            IssueKey = "SUPPORT-1234",
            Author = new ExternalImportPersonDto { AccountId = "assignee-1", DisplayName = "Ada Lovelace", Email = "assignee@example.com" },
            StartedAt = new DateTime(2026, 1, 4, 9, 30, 0, DateTimeKind.Utc),
            UpdatedAt = updatedAt ?? new DateTime(2026, 1, 4, 10, 0, 0, DateTimeKind.Utc),
            TimeSpentSeconds = 4500,
            Description = "Tempo work",
            RawFieldsJson = "{}"
        };
    }

    private class TestContext
    {
        public InMemoryRepository<WorkItem> WorkItems { get; } = new();
        public InMemoryRepository<TimeEntry> TimeEntries { get; } = new();
        public InMemoryRepository<Customer> Customers { get; } = new();
        public InMemoryRepository<Project> Projects { get; } = new();
        public InMemoryRepository<Employee> Employees { get; } = new();
        public InMemoryRepository<StatusConfig> StatusConfigs { get; } = new();
        public InMemoryRepository<ExternalImportSyncState> SyncStates { get; } = new();
        public Customer Customer { get; set; }
        public Project Project { get; set; }
        public Employee Employee { get; set; }
        public WorkItem WorkItem { get; set; }
        public StatusConfig NewStatus { get; set; }
        public StatusConfig InProgressStatus { get; set; }
        public StatusConfig ClosedStatus { get; set; }
    }

    private class FakeJiraApiClient : IJiraApiClient
    {
        private readonly List<JiraIssueImportDto> _issues;
        private readonly Exception _exception;
        public DateTime? LastUpdatedSince { get; private set; }

        public FakeJiraApiClient(params JiraIssueImportDto[] issues)
        {
            _issues = issues.ToList();
        }

        public FakeJiraApiClient(Exception exception)
        {
            _issues = new List<JiraIssueImportDto>();
            _exception = exception;
        }

        public Task<ExternalImportPage<JiraIssueImportDto>> GetSupportIssuesAsync(string projectKey, DateTime? updatedSince, string issueKey, string pageToken, int maxResults)
        {
            if (_exception != null)
                throw _exception;
            LastUpdatedSince = updatedSince;
            var startAt = int.TryParse(pageToken, out var parsedStartAt) ? parsedStartAt : 0;
            var items = _issues.Where(x => string.IsNullOrWhiteSpace(issueKey) || x.IssueKey == issueKey).Skip(startAt).Take(maxResults).ToList();
            var nextStartAt = startAt + items.Count;
            return Task.FromResult(new ExternalImportPage<JiraIssueImportDto> { Items = items, HasMore = nextStartAt < _issues.Count, NextPageToken = nextStartAt.ToString() });
        }

        public Task<ExternalImportPersonDto> GetUserAsync(string accountId)
        {
            return Task.FromResult(new ExternalImportPersonDto { AccountId = accountId, DisplayName = "Ada Lovelace", Email = "assignee@example.com" });
        }
    }

    private class FakeTempoApiClient : ITempoApiClient
    {
        private readonly List<TempoWorklogImportDto> _worklogs;
        public DateTime? LastUpdatedSince { get; private set; }

        public FakeTempoApiClient(params TempoWorklogImportDto[] worklogs)
        {
            _worklogs = worklogs.ToList();
        }

        public Task<ExternalImportPage<TempoWorklogImportDto>> GetWorklogsAsync(string projectKey, DateTime? updatedSince, string issueKey, DateTime? startedFrom, int maxResults, string pageToken)
        {
            LastUpdatedSince = updatedSince;
            var items = _worklogs.Where(x => string.IsNullOrWhiteSpace(issueKey) || x.IssueKey == issueKey).Take(maxResults).ToList();
            return Task.FromResult(new ExternalImportPage<TempoWorklogImportDto> { Items = items });
        }

        public Task<ExternalImportPage<TempoWorklogImportDto>> GetIssueWorklogsAsync(string issueId, DateTime? updatedSince, DateTime? startedFrom, int maxResults, string pageToken)
        {
            LastUpdatedSince = updatedSince;
            var items = _worklogs.Where(x => string.Equals(x.IssueId, issueId, StringComparison.OrdinalIgnoreCase)).Take(maxResults).ToList();
            return Task.FromResult(new ExternalImportPage<TempoWorklogImportDto> { Items = items });
        }
    }
}
