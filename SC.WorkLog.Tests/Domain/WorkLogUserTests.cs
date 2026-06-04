using SC.WorkLog.Domain.AggregateRoots;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Tests.Domain;

public class WorkLogUserTests
{
    [Fact]
    public void Constructor_WithoutEmail_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => new WorkLogUser("", "sub", WorkLogUserType.Employee, WorkLogUserRole.Employee, Guid.NewGuid(), null, "User", "admin"));
    }

    [Fact]
    public void Constructor_WithAdminCustomer_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => new WorkLogUser("customer@example.com", "sub", WorkLogUserType.Customer, WorkLogUserRole.Admin, null, Guid.NewGuid(), "Customer", "admin"));
    }

    [Fact]
    public void Constructor_WithEmployeeRoleOnCustomer_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => new WorkLogUser("customer@example.com", "sub", WorkLogUserType.Customer, WorkLogUserRole.Employee, null, Guid.NewGuid(), "Customer", "admin"));
    }

    [Fact]
    public void Constructor_WithCustomerRoleOnEmployee_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => new WorkLogUser("employee@example.com", "sub", WorkLogUserType.Employee, WorkLogUserRole.Customer, Guid.NewGuid(), null, "Employee", "admin"));
    }

    [Fact]
    public void Constructor_EmployeeWithoutEmployeeId_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => new WorkLogUser("employee@example.com", "sub", WorkLogUserType.Employee, WorkLogUserRole.Employee, null, null, "Employee", "admin"));
    }

    [Fact]
    public void Constructor_CustomerWithoutCustomerId_ThrowsArgumentException()
    {
        Assert.Throws<ArgumentException>(() => new WorkLogUser("customer@example.com", "sub", WorkLogUserType.Customer, WorkLogUserRole.Customer, null, null, "Customer", "admin"));
    }
}
