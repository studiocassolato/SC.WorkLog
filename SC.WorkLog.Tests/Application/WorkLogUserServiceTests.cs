#nullable disable

using SC.WorkLog.Application.DTO.Common;
using SC.WorkLog.Application.DTO.WorkLogUsers;
using SC.WorkLog.Application.Services;
using SC.WorkLog.Domain.AggregateRoots;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Tests.Application;

public class WorkLogUserServiceTests
{
    [Fact]
    public async Task CreateUser_WithDuplicateEmail_ThrowsArgumentException()
    {
        var context = CreateContext();
        context.Users.Items.Add(new WorkLogUser("ada@example.com", "sub-1", WorkLogUserType.Employee, WorkLogUserRole.Employee, context.Employee.Id, null, "Ada", "admin"));
        var service = CreateService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateUser(new CreateWorkLogUserRequest
        {
            Email = "ada@example.com",
            CognitoSub = "sub-2",
            UserType = WorkLogUserType.Employee,
            Role = WorkLogUserRole.Employee,
            EmployeeId = context.Employee.Id,
            Active = true
        }, AdminContext()));

        Assert.Contains("email must be unique", exception.Message);
    }

    [Fact]
    public async Task CreateUser_WithDuplicateCognitoSub_ThrowsArgumentException()
    {
        var context = CreateContext();
        context.Users.Items.Add(new WorkLogUser("ada@example.com", "same-sub", WorkLogUserType.Employee, WorkLogUserRole.Employee, context.Employee.Id, null, "Ada", "admin"));
        var service = CreateService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateUser(new CreateWorkLogUserRequest
        {
            Email = "other@example.com",
            CognitoSub = "same-sub",
            UserType = WorkLogUserType.Employee,
            Role = WorkLogUserRole.Employee,
            EmployeeId = context.Employee.Id,
            Active = true
        }, AdminContext()));

        Assert.Contains("CognitoSub must be unique", exception.Message);
    }

    [Fact]
    public async Task ResolveAuthenticatedUser_ByCognitoSub_ReturnsUser()
    {
        var context = CreateContext();
        var user = new WorkLogUser("ada@example.com", "sub-1", WorkLogUserType.Employee, WorkLogUserRole.Admin, context.Employee.Id, null, "Ada", "admin");
        context.Users.Items.Add(user);

        var resolved = await CreateService(context).ResolveAuthenticatedUser("sub-1", "wrong@example.com");

        Assert.Equal(user.Id, resolved.Id);
        Assert.Equal(WorkLogUserRole.Admin, resolved.Role);
    }

    [Fact]
    public async Task ResolveAuthenticatedUser_FallsBackToEmail_ReturnsUser()
    {
        var context = CreateContext();
        var user = new WorkLogUser("ada@example.com", null, WorkLogUserType.Employee, WorkLogUserRole.Employee, context.Employee.Id, null, "Ada", "admin");
        context.Users.Items.Add(user);

        var resolved = await CreateService(context).ResolveAuthenticatedUser("unknown-sub", "ada@example.com");

        Assert.Equal(user.Id, resolved.Id);
    }

    [Fact]
    public async Task ResolveAuthenticatedUser_InactiveUser_ThrowsArgumentException()
    {
        var context = CreateContext();
        var user = new WorkLogUser("ada@example.com", "sub-1", WorkLogUserType.Employee, WorkLogUserRole.Employee, context.Employee.Id, null, "Ada", "admin");
        user.Update(user.Email, user.CognitoSub, user.UserType, user.Role, user.EmployeeId, user.CustomerId, user.DisplayName, false, "admin");
        context.Users.Items.Add(user);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => CreateService(context).ResolveAuthenticatedUser("sub-1", "ada@example.com"));

        Assert.Contains("not active", exception.Message);
    }

    [Fact]
    public async Task ResolveAuthenticatedUser_CustomerUser_ThrowsUnauthorizedAccessException()
    {
        var context = CreateContext();
        var user = new WorkLogUser("customer@example.com", "sub-customer", WorkLogUserType.Customer, WorkLogUserRole.Customer, null, context.Customer.Id, "Customer", "admin");
        context.Users.Items.Add(user);

        var exception = await Assert.ThrowsAsync<UnauthorizedAccessException>(() => CreateService(context).ResolveAuthenticatedUser("sub-customer", "customer@example.com"));

        Assert.Contains("Customer access is not enabled", exception.Message);
    }

    [Fact]
    public async Task ResolveAuthenticatedUser_RoleComesFromWorkLogUser()
    {
        var context = CreateContext();
        var user = new WorkLogUser("ada@example.com", "sub-1", WorkLogUserType.Employee, WorkLogUserRole.Admin, context.Employee.Id, null, "Ada", "admin");
        context.Users.Items.Add(user);

        var resolved = await CreateService(context).ResolveAuthenticatedUser("sub-1", "ada@example.com");

        Assert.Equal(WorkLogUserRole.Admin, resolved.Role);
    }

    [Fact]
    public async Task GetUsers_WithEmployeeAndCustomerFilters_ReturnsScopedUsers()
    {
        var context = CreateContext();
        var otherEmployee = new Employee("Alan", "Turing", "alan@example.com", EmployeeLevel.Senior, 100m, 8m, "admin");
        var otherCustomer = new Customer("Other", null, "Other", "other@example.com", null, "admin");
        context.Employees.Items.Add(otherEmployee);
        context.Customers.Items.Add(otherCustomer);
        var employeeUser = new WorkLogUser("ada@example.com", "sub-1", WorkLogUserType.Employee, WorkLogUserRole.Employee, context.Employee.Id, null, "Ada", "admin");
        var otherEmployeeUser = new WorkLogUser("alan@example.com", "sub-2", WorkLogUserType.Employee, WorkLogUserRole.Admin, otherEmployee.Id, null, "Alan", "admin");
        var customerUser = new WorkLogUser("grace@example.com", "sub-3", WorkLogUserType.Customer, WorkLogUserRole.Customer, null, context.Customer.Id, "Grace", "admin");
        var otherCustomerUser = new WorkLogUser("other@example.com", "sub-4", WorkLogUserType.Customer, WorkLogUserRole.Customer, null, otherCustomer.Id, "Other", "admin");
        context.Users.Items.AddRange(new[] { employeeUser, otherEmployeeUser, customerUser, otherCustomerUser });
        var service = CreateService(context);

        var employeeUsers = await service.GetUsers(new WorkLogUserFilter { UserType = WorkLogUserType.Employee, EmployeeId = context.Employee.Id }, AdminContext());
        var customerUsers = await service.GetUsers(new WorkLogUserFilter { UserType = WorkLogUserType.Customer, CustomerId = context.Customer.Id }, AdminContext());

        Assert.Equal(employeeUser.Id, Assert.Single(employeeUsers).Id);
        Assert.Equal(customerUser.Id, Assert.Single(customerUsers).Id);
    }

    private static TestContext CreateContext()
    {
        var context = new TestContext();
        context.Employee = new Employee("Ada", "Lovelace", "ada@example.com", EmployeeLevel.Senior, 90m, 8m, "admin");
        context.Customer = new Customer("ACME", null, "Grace", "grace@example.com", null, "admin");
        context.Employees.Items.Add(context.Employee);
        context.Customers.Items.Add(context.Customer);
        return context;
    }

    private static WorkLogUserService CreateService(TestContext context)
    {
        return new WorkLogUserService(context.Users, context.Employees, context.Customers);
    }

    private static WorkLogUserContext AdminContext()
    {
        return new WorkLogUserContext
        {
            Email = "admin@example.com",
            Role = ApplicationUserRole.Admin
        };
    }

    private class TestContext
    {
        public InMemoryRepository<WorkLogUser> Users { get; } = new();
        public InMemoryRepository<Employee> Employees { get; } = new();
        public InMemoryRepository<Customer> Customers { get; } = new();
        public Employee Employee { get; set; }
        public Customer Customer { get; set; }
    }
}
