#nullable disable

using SC.WorkLog.Application.DTO.Common;
using SC.WorkLog.Application.DTO.StatusConfigs;
using SC.WorkLog.Application.Services;
using SC.WorkLog.Domain.AggregateRoots;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Tests.Application;

public class StatusConfigServiceTests
{
    private static readonly string[] ExpectedDefaultKeys =
    {
        "new",
        "in-progress",
        "code-review",
        "under-analysis",
        "waiting-for-customer",
        "closed",
        "happy-customer"
    };

    [Fact]
    public async Task EnsureDefaultStatuses_CreatesMissingDefaults()
    {
        var context = new TestContext();
        var service = CreateService(context);

        var statuses = await service.EnsureDefaultStatuses(AdminUser());

        Assert.Equal(ExpectedDefaultKeys, statuses.Select(x => x.Key).ToArray());
        Assert.Equal(ExpectedDefaultKeys.Length, context.StatusConfigs.Items.Count);
    }

    [Fact]
    public void GetDefaultStatusKeys_ReturnsExpectedKeys()
    {
        Assert.Equal(ExpectedDefaultKeys, StatusConfigService.GetDefaultStatusKeys());
    }

    [Fact]
    public async Task CreateStatusConfig_WithoutKey_ThrowsArgumentException()
    {
        var context = CreateContext();
        var service = CreateService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateStatusConfig(new CreateStatusConfigRequest
        {
            Key = "",
            Name = "Waiting",
            Typology = WorkItemStatusTypology.WaitingCustomer,
            CustomerDisplayName = "Waiting for customer",
            Order = 50,
            Active = true
        }, AdminUser()));

        Assert.Contains("Key is required", exception.Message);
    }

    [Theory]
    [InlineData("-leading")]
    [InlineData("trailing-")]
    [InlineData("two--hyphens")]
    [InlineData("has space")]
    [InlineData("has_underscore")]
    public async Task CreateStatusConfig_WithInvalidKey_ThrowsArgumentException(string key)
    {
        var context = CreateContext();
        var service = CreateService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateStatusConfig(new CreateStatusConfigRequest
        {
            Key = key,
            Name = $"Status {key}",
            Typology = WorkItemStatusTypology.WaitingCustomer,
            CustomerDisplayName = "Waiting for customer",
            Order = 50,
            Active = true
        }, AdminUser()));

        Assert.Contains("kebab-case", exception.Message);
    }

    [Fact]
    public async Task CreateStatusConfig_WithDuplicateKey_ThrowsArgumentException()
    {
        var context = CreateContext();
        var service = CreateService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateStatusConfig(new CreateStatusConfigRequest
        {
            Key = "new",
            Name = "Different name",
            Typology = WorkItemStatusTypology.New,
            CustomerDisplayName = "New",
            Order = 15,
            Active = true
        }, AdminUser()));

        Assert.Contains("key must be unique", exception.Message);
    }

    [Fact]
    public async Task CreateStatusConfig_AllowsMultipleStatusesWithSameTypology()
    {
        var context = CreateContext();
        var service = CreateService(context);

        var status = await service.CreateStatusConfig(new CreateStatusConfigRequest
        {
            Key = "code-review",
            Name = "Code review",
            Typology = WorkItemStatusTypology.InProgress,
            CustomerDisplayName = "In progress",
            Order = 30,
            Active = true
        }, AdminUser());

        Assert.Equal(WorkItemStatusTypology.InProgress, status.Typology);
        Assert.Contains(context.StatusConfigs.Items, x => x.Name == "Code review");
    }

    [Fact]
    public async Task EnsureDefaultStatuses_MatchesByKeyAndIsIdempotent()
    {
        var context = new TestContext();
        context.StatusConfigs.Items.Add(new StatusConfig("new", "Custom New", WorkItemStatusTypology.New, "Start", 5, true, "admin"));
        context.StatusConfigs.Items.Add(new StatusConfig("closed", "Custom Closed", WorkItemStatusTypology.Closed, "Done", 95, true, "admin"));
        var service = CreateService(context);

        await service.EnsureDefaultStatuses(AdminUser());
        var countAfterFirstRun = context.StatusConfigs.Items.Count;
        await service.EnsureDefaultStatuses(AdminUser());

        Assert.Equal(countAfterFirstRun, context.StatusConfigs.Items.Count);
        Assert.Contains(context.StatusConfigs.Items, x => x.Key == "new" && x.Name == "Custom New");
        Assert.Contains(context.StatusConfigs.Items, x => x.Key == "new" && x.CustomerDisplayName == "Start" && x.Order == 5);
        Assert.Contains(context.StatusConfigs.Items, x => x.Key == "closed" && x.Name == "Custom Closed" && x.Order == 95);
        Assert.Contains(context.StatusConfigs.Items, x => x.Key == "code-review");
    }

    [Fact]
    public async Task CreateStatusConfig_WithOnlyArchivedClosedTypology_SatisfiesClosedInvariant()
    {
        var context = new TestContext();
        context.StatusConfigs.Items.Add(new StatusConfig("new", "New", WorkItemStatusTypology.New, "New", 10, true, "admin"));
        context.StatusConfigs.Items.Add(new StatusConfig("happy-customer", "Happy customer", WorkItemStatusTypology.Archived, "Happy customer", 100, true, "admin"));
        var service = CreateService(context);

        var status = await service.CreateStatusConfig(new CreateStatusConfigRequest
        {
            Key = "in-progress",
            Name = "In progress",
            Typology = WorkItemStatusTypology.InProgress,
            CustomerDisplayName = "In progress",
            Order = 20,
            Active = true
        }, AdminUser());

        Assert.Equal("in-progress", status.Key);
    }

    [Fact]
    public async Task CreateStatusConfig_WithDuplicateName_ThrowsArgumentException()
    {
        var context = CreateContext();
        var service = CreateService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateStatusConfig(new CreateStatusConfigRequest
        {
            Key = "new-duplicate",
            Name = "New",
            Typology = WorkItemStatusTypology.InProgress,
            CustomerDisplayName = "In progress",
            Order = 20,
            Active = true
        }, AdminUser()));

        Assert.Contains("unique", exception.Message);
    }

    [Fact]
    public async Task CreateStatusConfig_WithoutActiveNewStatus_ThrowsArgumentException()
    {
        var context = new TestContext();
        context.StatusConfigs.Items.Add(new StatusConfig("closed", "Closed", WorkItemStatusTypology.Closed, "Closed", 90, true, "admin"));
        var service = CreateService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateStatusConfig(new CreateStatusConfigRequest
        {
            Key = "code-review",
            Name = "Code review",
            Typology = WorkItemStatusTypology.InProgress,
            CustomerDisplayName = "In progress",
            Order = 30,
            Active = true
        }, AdminUser()));

        Assert.Contains("active New", exception.Message);
    }

    [Fact]
    public async Task CreateStatusConfig_WithoutActiveClosedStatus_ThrowsArgumentException()
    {
        var context = new TestContext();
        context.StatusConfigs.Items.Add(new StatusConfig("new", "New", WorkItemStatusTypology.New, "New", 10, true, "admin"));
        var service = CreateService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateStatusConfig(new CreateStatusConfigRequest
        {
            Key = "in-progress",
            Name = "In progress",
            Typology = WorkItemStatusTypology.InProgress,
            CustomerDisplayName = "In progress",
            Order = 20,
            Active = true
        }, AdminUser()));

        Assert.Contains("active closed", exception.Message);
    }

    [Theory]
    [InlineData(WorkItemStatusTypology.Closed, true)]
    [InlineData(WorkItemStatusTypology.Archived, true)]
    [InlineData(WorkItemStatusTypology.New, false)]
    [InlineData(WorkItemStatusTypology.InProgress, false)]
    [InlineData(WorkItemStatusTypology.WaitingInternal, false)]
    [InlineData(WorkItemStatusTypology.WaitingCustomer, false)]
    public void StatusConfig_IsClosed_IsComputedFromTypology(WorkItemStatusTypology typology, bool expected)
    {
        var status = new StatusConfig("status", "Status", typology, "Status", 10, true, "admin");

        Assert.Equal(expected, status.IsClosed());
    }

    [Fact]
    public async Task CreateStatusConfig_WithoutCustomerDisplayName_ThrowsArgumentException()
    {
        var context = CreateContext();
        var service = CreateService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateStatusConfig(new CreateStatusConfigRequest
        {
            Key = "waiting",
            Name = "Waiting",
            Typology = WorkItemStatusTypology.WaitingCustomer,
            CustomerDisplayName = "",
            Order = 50,
            Active = true
        }, AdminUser()));

        Assert.Contains("customerDisplayName is required", exception.Message);
    }

    [Fact]
    public async Task CreateStatusConfig_WithUnsupportedTypology_ThrowsArgumentException()
    {
        var context = CreateContext();
        var service = CreateService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateStatusConfig(new CreateStatusConfigRequest
        {
            Key = "unsupported",
            Name = "Unsupported",
            Typology = (WorkItemStatusTypology)999,
            CustomerDisplayName = "Unsupported",
            Order = 50,
            Active = true
        }, AdminUser()));

        Assert.Contains("Unsupported", exception.Message);
    }

    [Fact]
    public async Task UpdateStatusConfig_CannotDeactivateLastActiveNewStatus()
    {
        var context = CreateContext();
        var service = CreateService(context);
        var newStatus = context.StatusConfigs.Items.Single(x => x.Typology == WorkItemStatusTypology.New);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateStatusConfig(new UpdateStatusConfigRequest
        {
            Id = newStatus.Id,
            Name = newStatus.Name,
            Typology = newStatus.Typology,
            CustomerDisplayName = newStatus.CustomerDisplayName,
            Order = newStatus.Order,
            Active = false
        }, AdminUser()));

        Assert.Contains("active New", exception.Message);
    }

    [Fact]
    public async Task UpdateStatusConfig_CannotDeactivateLastActiveClosedStatus()
    {
        var context = CreateContext();
        var service = CreateService(context);
        var closedStatus = context.StatusConfigs.Items.Single(x => x.Typology == WorkItemStatusTypology.Closed);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateStatusConfig(new UpdateStatusConfigRequest
        {
            Id = closedStatus.Id,
            Name = closedStatus.Name,
            Typology = closedStatus.Typology,
            CustomerDisplayName = closedStatus.CustomerDisplayName,
            Order = closedStatus.Order,
            Active = false
        }, AdminUser()));

        Assert.Contains("active closed", exception.Message);
    }

    [Fact]
    public async Task UpdateStatusConfig_DoesNotChangeKey()
    {
        var context = CreateContext();
        var service = CreateService(context);
        var status = context.StatusConfigs.Items.Single(x => x.Key == "in-progress");

        await service.UpdateStatusConfig(new UpdateStatusConfigRequest
        {
            Id = status.Id,
            Name = "Doing",
            Typology = status.Typology,
            CustomerDisplayName = "In progress",
            Order = status.Order,
            Active = true
        }, AdminUser());

        Assert.Equal("in-progress", status.Key);
        Assert.Equal("Doing", status.Name);
    }

    private static TestContext CreateContext()
    {
        var context = new TestContext();
        context.StatusConfigs.Items.Add(new StatusConfig("new", "New", WorkItemStatusTypology.New, "New", 10, true, "admin"));
        context.StatusConfigs.Items.Add(new StatusConfig("in-progress", "In progress", WorkItemStatusTypology.InProgress, "In progress", 20, true, "admin"));
        context.StatusConfigs.Items.Add(new StatusConfig("closed", "Closed", WorkItemStatusTypology.Closed, "Closed", 90, true, "admin"));
        return context;
    }

    private static StatusConfigService CreateService(TestContext context)
    {
        return new StatusConfigService(context.StatusConfigs);
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
        public InMemoryRepository<StatusConfig> StatusConfigs { get; } = new();
    }
}
