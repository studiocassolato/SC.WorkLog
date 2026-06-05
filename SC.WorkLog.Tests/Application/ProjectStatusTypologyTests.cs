#nullable disable

using SC.WorkLog.Application.DTO.Common;
using SC.WorkLog.Application.Services;
using SC.WorkLog.Domain.AggregateRoots;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Tests.Application;

public class ProjectStatusTypologyTests
{
    [Fact]
    public async Task ProjectSummary_UsesStatusTypologyForOpenAndClosedCounts()
    {
        var context = CreateContext();
        var service = CreateProjectService(context);

        var projects = await service.SearchProjectsAsync(null, context.Customer.Id, null, null, AdminUser());

        var project = Assert.Single(projects);
        Assert.Equal(4, project.WorkItemCount);
        Assert.Equal(3, project.OpenWorkItemCount);
    }

    [Fact]
    public async Task ProjectDetail_GroupsWorkItemsByStatusTypology()
    {
        var context = CreateContext();
        var service = CreateProjectService(context);

        var detail = await service.GetProjectDetailAsync(context.Project.Id, AdminUser());

        Assert.Equal(1, detail.WorkItemSummary.New);
        Assert.Equal(1, detail.WorkItemSummary.InProgress);
        Assert.Equal(1, detail.WorkItemSummary.WaitingCustomer);
        Assert.Equal(1, detail.WorkItemSummary.Archived);
        Assert.Equal(0, detail.WorkItemSummary.Closed);
    }

    private static TestContext CreateContext()
    {
        var context = new TestContext();
        context.Employee = new Employee("Ada", "Lovelace", "ada@example.com", EmployeeLevel.Senior, 90m, 8m, "admin");
        context.Customer = new Customer("ACME", "acme.test", "Grace", "grace@example.com", null, "admin");
        context.Project = new Project(context.Customer.Id, "Project", ProjectPaymentType.TimeAndMaterial, ProjectStatus.Active, null, 60m, 90m, 120m, null, "admin");

        var newStatus = new StatusConfig("new", "New", WorkItemStatusTypology.New, "New", 10, true, "admin");
        var codeReviewStatus = new StatusConfig("code-review", "Code review", WorkItemStatusTypology.InProgress, "In progress", 30, true, "admin");
        var waitingCustomerStatus = new StatusConfig("waiting-for-customer", "Waiting for customer", WorkItemStatusTypology.WaitingCustomer, "Waiting for customer", 50, true, "admin");
        var happyCustomerStatus = new StatusConfig("happy-customer", "Happy customer", WorkItemStatusTypology.Archived, "Happy customer", 100, true, "admin");

        context.Employees.Items.Add(context.Employee);
        context.Customers.Items.Add(context.Customer);
        context.Projects.Items.Add(context.Project);
        context.StatusConfigs.Items.AddRange(new[] { newStatus, codeReviewStatus, waitingCustomerStatus, happyCustomerStatus });
        context.WorkItems.Items.Add(new WorkItem("WL-1", context.Project.Id, "New task", "Task", newStatus.Key, WorkItemPriority.Normal, null, null, WorkItemOrigin.Manual, null, DateTime.Today, false, "admin"));
        context.WorkItems.Items.Add(new WorkItem("WL-2", context.Project.Id, "Review task", "Task", codeReviewStatus.Key, WorkItemPriority.Normal, null, null, WorkItemOrigin.Manual, null, DateTime.Today, false, "admin"));
        context.WorkItems.Items.Add(new WorkItem("WL-3", context.Project.Id, "Customer task", "Task", waitingCustomerStatus.Key, WorkItemPriority.Normal, null, null, WorkItemOrigin.Manual, null, DateTime.Today, false, "admin"));
        context.WorkItems.Items.Add(new WorkItem("WL-4", context.Project.Id, "Archived task", "Task", happyCustomerStatus.Key, WorkItemPriority.Normal, null, null, WorkItemOrigin.Manual, null, DateTime.Today, false, "admin"));
        return context;
    }

    private static ProjectService CreateProjectService(TestContext context)
    {
        return new ProjectService(
            context.Projects,
            context.Customers,
            context.ProjectMilestones,
            context.WorkItems,
            context.TimeEntries,
            context.ProjectPayments,
            context.ContractPeriods,
            context.Employees,
            context.StatusConfigs,
            new ProjectReportService(context.Projects, context.WorkItems, context.TimeEntries, context.ProjectPayments, context.ContractPeriods, context.Customers));
    }

    private static WorkLogUserContext AdminUser()
    {
        return new WorkLogUserContext
        {
            UserId = Guid.NewGuid(),
            EmployeeId = Guid.NewGuid(),
            Email = "admin@example.com",
            Role = ApplicationUserRole.Admin
        };
    }

    private class TestContext
    {
        public InMemoryRepository<Employee> Employees { get; } = new();
        public InMemoryRepository<Customer> Customers { get; } = new();
        public InMemoryRepository<Project> Projects { get; } = new();
        public InMemoryRepository<ProjectMilestone> ProjectMilestones { get; } = new();
        public InMemoryRepository<WorkItem> WorkItems { get; } = new();
        public InMemoryRepository<TimeEntry> TimeEntries { get; } = new();
        public InMemoryRepository<ProjectPayment> ProjectPayments { get; } = new();
        public InMemoryRepository<ProjectContractPeriod> ContractPeriods { get; } = new();
        public InMemoryRepository<StatusConfig> StatusConfigs { get; } = new();
        public Employee Employee { get; set; }
        public Customer Customer { get; set; }
        public Project Project { get; set; }
    }
}
