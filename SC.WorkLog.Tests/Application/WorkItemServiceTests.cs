#nullable disable

using SC.WorkLog.Application.DTO.Common;
using SC.WorkLog.Application.DTO.WorkItems;
using SC.WorkLog.Application.Services;
using SC.WorkLog.Domain.AggregateRoots;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Tests.Application;

public class WorkItemServiceTests
{
    [Fact]
    public async Task CreateWorkItemAsync_WithEmployeeUser_ThrowsArgumentException()
    {
        var context = CreateContext();
        var service = CreateService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateWorkItemAsync(CreateRequest(context), EmployeeUser(context.Employee.Id)));

        Assert.Contains("requires Admin role", exception.Message);
    }

    [Fact]
    public async Task UpdateWorkItemAsync_WithEmployeeUser_ThrowsArgumentException()
    {
        var context = CreateContext();
        var service = CreateService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateWorkItemAsync(UpdateRequest(context), EmployeeUser(context.Employee.Id)));

        Assert.Contains("requires Admin role", exception.Message);
    }

    [Fact]
    public async Task CreateWorkItemAsync_WithAdmin_CreatesWorkItem()
    {
        var context = CreateContext();
        var service = CreateService(context);

        var response = await service.CreateWorkItemAsync(CreateRequest(context), AdminUser(context.Employee.Id));

        Assert.Equal("New work item", response.Title);
        Assert.Contains(context.WorkItems.Items, x => x.Id == response.Id);
    }

    [Fact]
    public async Task CreateWorkItemAsync_WithoutStatusKey_UsesInitialNewStatus()
    {
        var context = CreateContext();
        var service = CreateService(context);
        var request = CreateRequest(context);
        request.StatusKey = null;

        var response = await service.CreateWorkItemAsync(request, AdminUser(context.Employee.Id));

        Assert.Equal(context.NewStatus.Key, response.StatusKey);
    }

    [Fact]
    public async Task CreateWorkItemAsync_WithoutStatusKey_UsesFirstActiveNewStatusByOrder()
    {
        var context = CreateContext();
        var firstNewStatus = new StatusConfig("intake", "Intake", WorkItemStatusTypology.New, "New", 5, true, "admin");
        context.StatusConfigs.Items.Add(firstNewStatus);
        var service = CreateService(context);
        var request = CreateRequest(context);
        request.StatusKey = null;

        var response = await service.CreateWorkItemAsync(request, AdminUser(context.Employee.Id));

        Assert.Equal(firstNewStatus.Key, response.StatusKey);
    }

    [Fact]
    public async Task CreateWorkItemAsync_WithInvalidStatusKey_ThrowsArgumentException()
    {
        var context = CreateContext();
        var service = CreateService(context);
        var request = CreateRequest(context);
        request.StatusKey = "missing-status";

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateWorkItemAsync(request, AdminUser(context.Employee.Id)));

        Assert.Contains("Active status config not found", exception.Message);
    }

    [Fact]
    public async Task CreateWorkItemAsync_WithInactiveStatusKey_ThrowsArgumentException()
    {
        var context = CreateContext();
        var inactive = new StatusConfig("inactive", "Inactive", WorkItemStatusTypology.InProgress, "Inactive", 40, false, "admin");
        context.StatusConfigs.Items.Add(inactive);
        var service = CreateService(context);
        var request = CreateRequest(context);
        request.StatusKey = inactive.Key;

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateWorkItemAsync(request, AdminUser(context.Employee.Id)));

        Assert.Contains("Active status config not found", exception.Message);
    }

    [Fact]
    public async Task CreateWorkItemAsync_WithoutAssignee_CreatesUnassignedWorkItem()
    {
        var context = CreateContext();
        var service = CreateService(context);
        var request = CreateRequest(context);
        request.AssigneeId = null;

        var response = await service.CreateWorkItemAsync(request, AdminUser(context.Employee.Id));

        Assert.Null(response.AssigneeId);
        Assert.Null(response.AssigneeName);
    }

    [Fact]
    public async Task UpdateWorkItemAsync_WithAdmin_UpdatesWorkItem()
    {
        var context = CreateContext();
        var service = CreateService(context);
        var request = UpdateRequest(context);
        request.Title = "Updated title";

        var response = await service.UpdateWorkItemAsync(request, AdminUser(context.Employee.Id));

        Assert.Equal("Updated title", response.Title);
        Assert.Equal("Updated title", context.WorkItem.Title);
    }

    [Fact]
    public async Task UpdateWorkItemAsync_WithActiveStatusKey_ChangesStatus()
    {
        var context = CreateContext();
        var inProgress = new StatusConfig("in-progress", "In progress", WorkItemStatusTypology.InProgress, "In progress", 20, true, "admin");
        context.StatusConfigs.Items.Add(inProgress);
        var service = CreateService(context);
        var request = UpdateRequest(context);
        request.StatusKey = inProgress.Key;

        var response = await service.UpdateWorkItemAsync(request, AdminUser(context.Employee.Id));

        Assert.Equal(inProgress.Key, response.StatusKey);
        Assert.Equal(WorkItemStatusTypology.InProgress, response.StatusTypology);
        Assert.False(response.IsClosed);
    }

    [Fact]
    public async Task UpdateWorkItemAsync_WithNullAssignee_UnassignsWorkItem()
    {
        var context = CreateContext();
        var service = CreateService(context);
        var request = UpdateRequest(context);
        request.AssigneeId = null;

        var response = await service.UpdateWorkItemAsync(request, AdminUser(context.Employee.Id));

        Assert.Null(response.AssigneeId);
        Assert.Null(response.AssigneeName);
    }

    [Fact]
    public async Task UpdateWorkItemAsync_WithMissingAssignee_ThrowsArgumentException()
    {
        var context = CreateContext();
        var service = CreateService(context);
        var request = UpdateRequest(context);
        request.AssigneeId = Guid.NewGuid();

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateWorkItemAsync(request, AdminUser(context.Employee.Id)));

        Assert.Contains("Employee not found", exception.Message);
    }

    [Fact]
    public async Task UpdateWorkItemAsync_WithNewProject_ChangesProject()
    {
        var context = CreateContext();
        var otherProject = new Project(context.Customer.Id, "Other Project", ProjectPaymentType.Internal, ProjectStatus.Active, null, null, null, null, null, "admin");
        context.Projects.Items.Add(otherProject);
        var service = CreateService(context);
        var request = UpdateRequest(context);
        request.ProjectId = otherProject.Id;

        var response = await service.UpdateWorkItemAsync(request, AdminUser(context.Employee.Id));

        Assert.Equal(otherProject.Id, context.WorkItem.ProjectId);
        Assert.Equal(otherProject.Id, response.ProjectId);
        Assert.Equal("Other Project", response.ProjectName);
    }

    [Fact]
    public async Task UpdateWorkItemAsync_WithNewProject_UpdatesRelatedTimeEntryProjectIds()
    {
        var context = CreateContext();
        var otherProject = new Project(context.Customer.Id, "Other Project", ProjectPaymentType.Internal, ProjectStatus.Active, null, null, null, null, null, "admin");
        context.Projects.Items.Add(otherProject);
        var firstEntry = new TimeEntry(context.Employee.Id, context.WorkItem.Id, context.Project.Id, DateTime.Today, 3m, 2m, "Work", null, RequestStatus.PendingApproval, null, EmployeeLevel.Senior, 90m, 120m, "admin");
        var secondEntry = new TimeEntry(context.Employee.Id, context.WorkItem.Id, context.Project.Id, DateTime.Today.AddDays(1), 1m, 1m, "More work", null, RequestStatus.Approved, "Approved", EmployeeLevel.Mid, 80m, 100m, "admin");
        context.TimeEntries.Items.Add(firstEntry);
        context.TimeEntries.Items.Add(secondEntry);
        var firstWorkItemId = firstEntry.WorkItemId;
        var secondWorkItemId = secondEntry.WorkItemId;
        var firstLevel = firstEntry.EmployeeLevelSnapshot;
        var secondDefaultRate = secondEntry.EmployeeDefaultRateSnapshot;
        var secondProjectRate = secondEntry.ProjectRateSnapshot;
        var service = CreateService(context);
        var request = UpdateRequest(context);
        request.ProjectId = otherProject.Id;

        await service.UpdateWorkItemAsync(request, AdminUser(context.Employee.Id));

        Assert.All(context.TimeEntries.Items, entry => Assert.Equal(otherProject.Id, entry.ProjectId));
        Assert.Equal(firstWorkItemId, firstEntry.WorkItemId);
        Assert.Equal(secondWorkItemId, secondEntry.WorkItemId);
        Assert.Equal(firstLevel, firstEntry.EmployeeLevelSnapshot);
        Assert.Equal(secondDefaultRate, secondEntry.EmployeeDefaultRateSnapshot);
        Assert.Equal(secondProjectRate, secondEntry.ProjectRateSnapshot);
    }

    [Fact]
    public async Task UpdateWorkItemAsync_WithNewProject_DoesNotUpdateUnrelatedTimeEntries()
    {
        var context = CreateContext();
        var otherProject = new Project(context.Customer.Id, "Other Project", ProjectPaymentType.Internal, ProjectStatus.Active, null, null, null, null, null, "admin");
        var unrelatedWorkItem = new WorkItem("WL-X", context.Project.Id, "Unrelated", "Other", context.NewStatus.Key, WorkItemPriority.Normal, context.Employee.Id, WorkItemOrigin.Manual, null, DateTime.Today, false, "admin");
        var unrelatedEntry = new TimeEntry(context.Employee.Id, unrelatedWorkItem.Id, context.Project.Id, DateTime.Today, 2m, 2m, "Unrelated", null, RequestStatus.PendingApproval, null, EmployeeLevel.Senior, 90m, 120m, "admin");
        context.Projects.Items.Add(otherProject);
        context.WorkItems.Items.Add(unrelatedWorkItem);
        context.TimeEntries.Items.Add(unrelatedEntry);
        var service = CreateService(context);
        var request = UpdateRequest(context);
        request.ProjectId = otherProject.Id;

        await service.UpdateWorkItemAsync(request, AdminUser(context.Employee.Id));

        Assert.Equal(context.Project.Id, unrelatedEntry.ProjectId);
    }

    [Fact]
    public async Task UpdateWorkItemAsync_WithMissingProject_ThrowsArgumentException()
    {
        var context = CreateContext();
        var service = CreateService(context);
        var request = UpdateRequest(context);
        request.ProjectId = Guid.NewGuid();

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateWorkItemAsync(request, AdminUser(context.Employee.Id)));

        Assert.Contains("Project not found", exception.Message);
    }

    [Fact]
    public async Task GetWorkItemDetailAsync_LoadsStatusFromStatusKey()
    {
        var context = CreateContext();
        context.WorkItem.ChangeStatus(context.ClosedStatus.Key, DateTime.Today, "admin");
        var service = CreateService(context);

        var detail = await service.GetWorkItemDetailAsync(context.WorkItem.Id, AdminUser(context.Employee.Id));

        Assert.Equal(context.ClosedStatus.Key, detail.StatusKey);
        Assert.Equal(context.ClosedStatus.Name, detail.StatusName);
        Assert.Equal(WorkItemStatusTypology.Closed, detail.StatusTypology);
        Assert.Equal(context.ClosedStatus.CustomerDisplayName, detail.CustomerDisplayName);
        Assert.True(detail.IsClosed);
    }

    [Fact]
    public async Task GetWorkItemDetailAsync_WithMissingWorkItem_ThrowsArgumentException()
    {
        var context = CreateContext();
        var service = CreateService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.GetWorkItemDetailAsync(Guid.NewGuid(), AdminUser(context.Employee.Id)));

        Assert.Contains("Work item not found", exception.Message);
    }

    [Fact]
    public async Task GetWorkItemDetailAsync_HidesApprovedHoursForEmployee()
    {
        var context = CreateContext();
        context.TimeEntries.Items.Add(new TimeEntry(context.Employee.Id, context.WorkItem.Id, context.Project.Id, DateTime.Today, 3m, 2m, "Work", null, RequestStatus.PendingApproval, null, EmployeeLevel.Senior, 90m, 120m, "admin"));
        var service = CreateService(context);

        var employeeDetail = await service.GetWorkItemDetailAsync(context.WorkItem.Id, EmployeeUser(context.Employee.Id));
        var adminDetail = await service.GetWorkItemDetailAsync(context.WorkItem.Id, AdminUser(context.Employee.Id));

        Assert.Equal(3m, employeeDetail.LoggedHours);
        Assert.Null(employeeDetail.ApprovedHours);
        Assert.Equal(2m, adminDetail.ApprovedHours);
    }

    [Fact]
    public async Task GetWorkItemsAsync_WithProjectFilter_ReturnsOnlyProjectItems()
    {
        var context = CreateContext();
        var otherProject = new Project(context.Customer.Id, "Other Project", ProjectPaymentType.Internal, ProjectStatus.Active, null, null, null, null, null, "admin");
        var otherWorkItem = new WorkItem("WL-OTHER", otherProject.Id, "Other task", "Other", context.NewStatus.Key, WorkItemPriority.Normal, context.Employee.Id, WorkItemOrigin.Manual, null, DateTime.Today, false, "admin");
        context.Projects.Items.Add(otherProject);
        context.WorkItems.Items.Add(otherWorkItem);
        var service = CreateService(context);

        var items = await service.GetWorkItemsAsync(new WorkItemFilter { ProjectId = context.Project.Id }, AdminUser(context.Employee.Id));

        var item = Assert.Single(items);
        Assert.Equal(context.WorkItem.Id, item.Id);
    }

    [Fact]
    public async Task GetWorkItemsAsync_WithAssigneeFilter_ReturnsOnlyAssigneeItems()
    {
        var context = CreateContext();
        var otherEmployee = new Employee("Grace", "Hopper", "grace@example.com", EmployeeLevel.Senior, 100m, 8m, "admin");
        var otherWorkItem = new WorkItem("WL-OTHER", context.Project.Id, "Other task", "Other", context.NewStatus.Key, WorkItemPriority.Normal, otherEmployee.Id, WorkItemOrigin.Manual, null, DateTime.Today, false, "admin");
        context.Employees.Items.Add(otherEmployee);
        context.WorkItems.Items.Add(otherWorkItem);
        var service = CreateService(context);

        var items = await service.GetWorkItemsAsync(new WorkItemFilter { AssigneeId = otherEmployee.Id }, AdminUser(context.Employee.Id));

        var item = Assert.Single(items);
        Assert.Equal(otherWorkItem.Id, item.Id);
    }

    [Fact]
    public async Task GetWorkItemsAsync_WithStatusKeyFilter_ResolvesStatusDto()
    {
        var context = CreateContext();
        context.WorkItem.ChangeStatus(context.ClosedStatus.Key, DateTime.Today, "admin");
        var service = CreateService(context);

        var items = await service.GetWorkItemsAsync(new WorkItemFilter { StatusKey = context.ClosedStatus.Key, IncludeClosed = true }, AdminUser(context.Employee.Id));

        var item = Assert.Single(items);
        Assert.Equal(context.ClosedStatus.Key, item.StatusKey);
        Assert.Equal(context.ClosedStatus.Name, item.StatusName);
        Assert.Equal(WorkItemStatusTypology.Closed, item.StatusTypology);
        Assert.True(item.IsClosed);
    }

    [Fact]
    public async Task GetWorkItemsAsync_ExcludeAndIncludeClosed_UsesStatusTypology()
    {
        var context = CreateContext();
        context.WorkItem.ChangeStatus(context.ClosedStatus.Key, DateTime.Today, "admin");
        var service = CreateService(context);

        var openOnly = await service.GetWorkItemsAsync(new WorkItemFilter(), AdminUser(context.Employee.Id));
        var includeClosed = await service.GetWorkItemsAsync(new WorkItemFilter { IncludeClosed = true }, AdminUser(context.Employee.Id));

        Assert.Empty(openOnly);
        Assert.Single(includeClosed);
    }

    [Fact]
    public async Task GetWorkItemsAsync_WithUnassignedOnly_ReturnsOnlyUnassignedItems()
    {
        var context = CreateContext();
        var unassigned = new WorkItem("WL-UNASSIGNED", context.Project.Id, "Unassigned task", "Other", context.NewStatus.Key, WorkItemPriority.Normal, null, WorkItemOrigin.Manual, null, DateTime.Today, false, "admin");
        context.WorkItems.Items.Add(unassigned);
        var service = CreateService(context);

        var items = await service.GetWorkItemsAsync(new WorkItemFilter { UnassignedOnly = true }, AdminUser(context.Employee.Id));

        var item = Assert.Single(items);
        Assert.Equal(unassigned.Id, item.Id);
        Assert.Null(item.AssigneeId);
    }

    [Fact]
    public async Task AddCommentAsync_WithEmployeeUser_AddsCommentAsCurrentEmployee()
    {
        var context = CreateContext();
        var service = CreateService(context);

        await service.AddCommentAsync(new AddWorkItemCommentRequest
        {
            WorkItemId = context.WorkItem.Id,
            Content = "Comment from current employee",
            IsInternal = true
        }, EmployeeUser(context.Employee.Id));

        var comment = Assert.Single(context.Comments.Items);
        Assert.Equal(context.Employee.Id, comment.EmployeeId);
        Assert.Equal("Comment from current employee", comment.Content);
    }

    [Fact]
    public async Task AddCommentAsync_IgnoresOtherEmployeesAndUsesCurrentEmployeeId()
    {
        var context = CreateContext();
        var otherEmployee = new Employee("Grace", "Hopper", "grace@example.com", EmployeeLevel.Senior, 100m, 8m, "admin");
        context.Employees.Items.Add(otherEmployee);
        var service = CreateService(context);

        await service.AddCommentAsync(new AddWorkItemCommentRequest
        {
            WorkItemId = context.WorkItem.Id,
            Content = "Cannot spoof the author",
            IsInternal = false
        }, EmployeeUser(context.Employee.Id));

        var comment = Assert.Single(context.Comments.Items);
        Assert.Equal(context.Employee.Id, comment.EmployeeId);
        Assert.NotEqual(otherEmployee.Id, comment.EmployeeId);
    }

    [Fact]
    public async Task AddCommentAsync_WithoutCurrentEmployeeId_ThrowsArgumentException()
    {
        var context = CreateContext();
        var service = CreateService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.AddCommentAsync(new AddWorkItemCommentRequest
        {
            WorkItemId = context.WorkItem.Id,
            Content = "Missing employee id",
            IsInternal = true
        }, new WorkLogUserContext
        {
            UserId = Guid.NewGuid(),
            Email = "employee@example.com",
            Role = ApplicationUserRole.Employee
        }));

        Assert.Contains("EmployeeId is required", exception.Message);
    }

    private static TestContext CreateContext()
    {
        var context = new TestContext();
        context.Employee = new Employee("Ada", "Lovelace", "ada@example.com", EmployeeLevel.Senior, 90m, 8m, "admin");
        context.Customer = new Customer("ACME", "acme.test", "Grace", "grace@example.com", null, "admin");
        context.Project = new Project(context.Customer.Id, "Project", ProjectPaymentType.TimeAndMaterial, ProjectStatus.Active, null, 60m, 90m, 120m, null, "admin");
        context.NewStatus = new StatusConfig("new", "New", WorkItemStatusTypology.New, "New", 10, true, "admin");
        context.ClosedStatus = new StatusConfig("closed", "Closed", WorkItemStatusTypology.Closed, "Closed", 90, true, "admin");
        context.WorkItem = new WorkItem("WL-1", context.Project.Id, "Task", "Task description", context.NewStatus.Key, WorkItemPriority.Normal, context.Employee.Id, WorkItemOrigin.Manual, null, DateTime.Today, false, "admin");
        context.Employees.Items.Add(context.Employee);
        context.Customers.Items.Add(context.Customer);
        context.Projects.Items.Add(context.Project);
        context.StatusConfigs.Items.Add(context.NewStatus);
        context.StatusConfigs.Items.Add(context.ClosedStatus);
        context.WorkItems.Items.Add(context.WorkItem);
        return context;
    }

    private static WorkItemService CreateService(TestContext context)
    {
        return new WorkItemService(context.WorkItems, context.Projects, context.Customers, context.Employees, context.TimeEntries, context.Comments, context.StatusConfigs);
    }

    private static CreateWorkItemRequest CreateRequest(TestContext context)
    {
        return new CreateWorkItemRequest
        {
            Code = "WL-2",
            ProjectId = context.Project.Id,
            Title = "New work item",
            Description = "Created by admin",
            StatusKey = context.NewStatus.Key,
            Priority = WorkItemPriority.Normal,
            AssigneeId = context.Employee.Id,
            Origin = WorkItemOrigin.Manual,
            OpeningDate = DateTime.Today
        };
    }

    private static UpdateWorkItemRequest UpdateRequest(TestContext context)
    {
        return new UpdateWorkItemRequest
        {
            Id = context.WorkItem.Id,
            Code = context.WorkItem.Code,
            ProjectId = context.Project.Id,
            Title = context.WorkItem.Title,
            Description = context.WorkItem.Description,
            StatusKey = context.WorkItem.StatusKey,
            Priority = context.WorkItem.Priority,
            AssigneeId = context.Employee.Id,
            Origin = context.WorkItem.Origin,
            OpeningDate = context.WorkItem.OpeningDate,
            IsPriority = context.WorkItem.IsPriority
        };
    }

    private static WorkLogUserContext AdminUser(Guid employeeId)
    {
        return new WorkLogUserContext
        {
            UserId = Guid.NewGuid(),
            EmployeeId = employeeId,
            Email = "admin@example.com",
            Role = ApplicationUserRole.Admin
        };
    }

    private static WorkLogUserContext EmployeeUser(Guid employeeId)
    {
        return new WorkLogUserContext
        {
            UserId = Guid.NewGuid(),
            EmployeeId = employeeId,
            Email = "employee@example.com",
            Role = ApplicationUserRole.Employee
        };
    }

    private class TestContext
    {
        public InMemoryRepository<WorkItem> WorkItems { get; } = new();
        public InMemoryRepository<Project> Projects { get; } = new();
        public InMemoryRepository<Customer> Customers { get; } = new();
        public InMemoryRepository<Employee> Employees { get; } = new();
        public InMemoryRepository<TimeEntry> TimeEntries { get; } = new();
        public InMemoryRepository<WorkItemComment> Comments { get; } = new();
        public InMemoryRepository<StatusConfig> StatusConfigs { get; } = new();
        public Employee Employee { get; set; }
        public Customer Customer { get; set; }
        public Project Project { get; set; }
        public WorkItem WorkItem { get; set; }
        public StatusConfig NewStatus { get; set; }
        public StatusConfig ClosedStatus { get; set; }
    }
}
