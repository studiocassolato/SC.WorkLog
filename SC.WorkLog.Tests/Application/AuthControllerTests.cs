#nullable disable

using Microsoft.AspNetCore.Mvc;
using SC.WorkLog.Application.DTO.Common;
using SC.WorkLog.Domain.Enums;
using SC.WorkLog.Domain.Interfaces;
using SC.WorkLog.WebApp.Controllers;

namespace SC.WorkLog.Tests.Application;

public class AuthControllerTests
{
    [Fact]
    public async Task Me_ReturnsCurrentUserResponse()
    {
        var userId = Guid.NewGuid();
        var employeeId = Guid.NewGuid();
        var controller = new AuthController(new TestCurrentUser
        {
            Subject = "cognito-sub",
            Email = "admin@example.com",
            Name = "Ada Lovelace",
            WorkLogUserId = userId,
            UserType = WorkLogUserType.Employee,
            Role = WorkLogUserRole.Admin,
            EmployeeId = employeeId,
            IsAuthenticated = true,
            IsAdmin = true,
            IsEmployee = true
        });

        var result = await controller.Me();

        var response = AssertCurrentUserResponse(result);
        Assert.Equal("cognito-sub", response.Subject);
        Assert.Equal("admin@example.com", response.Email);
        Assert.Equal("Ada Lovelace", response.Name);
        Assert.Equal(userId, response.WorkLogUserId);
        Assert.Equal(WorkLogUserType.Employee, response.UserType);
        Assert.Equal(WorkLogUserRole.Admin, response.Role);
        Assert.Equal(employeeId, response.EmployeeId);
        Assert.Null(response.CustomerId);
        Assert.True(response.IsAuthenticated);
        Assert.True(response.IsAdmin);
        Assert.True(response.IsEmployee);
        Assert.False(response.IsCustomer);
    }

    [Fact]
    public async Task Me_MapsCustomerFlags()
    {
        var customerId = Guid.NewGuid();
        var controller = new AuthController(new TestCurrentUser
        {
            Subject = "customer-sub",
            Email = "customer@example.com",
            Name = "Customer User",
            WorkLogUserId = Guid.NewGuid(),
            UserType = WorkLogUserType.Customer,
            Role = WorkLogUserRole.Customer,
            CustomerId = customerId,
            IsAuthenticated = true,
            IsCustomer = true
        });

        var result = await controller.Me();

        var response = AssertCurrentUserResponse(result);
        Assert.Equal(WorkLogUserType.Customer, response.UserType);
        Assert.Equal(WorkLogUserRole.Customer, response.Role);
        Assert.Equal(customerId, response.CustomerId);
        Assert.False(response.IsAdmin);
        Assert.False(response.IsEmployee);
        Assert.True(response.IsCustomer);
    }

    private static CurrentUserResponse AssertCurrentUserResponse(IActionResult result)
    {
        var ok = Assert.IsType<OkObjectResult>(result);
        return Assert.IsType<CurrentUserResponse>(ok.Value);
    }

    private class TestCurrentUser : ICurrentUser
    {
        public string UserName => Name ?? Email ?? Subject ?? "anonymous";
        public string Subject { get; set; }
        public string Email { get; set; }
        public string Name { get; set; }
        public Guid? WorkLogUserId { get; set; }
        public WorkLogUserType UserType { get; set; }
        public WorkLogUserRole Role { get; set; }
        public Guid? EmployeeId { get; set; }
        public Guid? CustomerId { get; set; }
        public bool IsAuthenticated { get; set; }
        public bool IsAdmin { get; set; }
        public bool IsEmployee { get; set; }
        public bool IsCustomer { get; set; }
    }
}
