#nullable disable

using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using SC.WorkLog.Domain.Constants;
using SC.WorkLog.Domain.Enums;
using SC.WorkLog.WebApp.Models;

namespace SC.WorkLog.Tests.Application;

public class CurrentUserTests
{
    [Fact]
    public void CurrentUser_ExposesWorkLogUserContextClaims()
    {
        var userId = Guid.NewGuid();
        var employeeId = Guid.NewGuid();
        var currentUser = CreateCurrentUser(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "cognito-sub"),
            new Claim(ClaimTypes.Email, "admin@example.com"),
            new Claim(ClaimTypes.Name, "Ada Lovelace"),
            new Claim(WorkLogClaimTypes.WorkLogUserId, userId.ToString()),
            new Claim(WorkLogClaimTypes.UserType, WorkLogUserType.Employee.ToString()),
            new Claim(WorkLogClaimTypes.Role, WorkLogUserRole.Admin.ToString()),
            new Claim(WorkLogClaimTypes.EmployeeId, employeeId.ToString())
        });

        Assert.Equal(userId, currentUser.WorkLogUserId);
        Assert.Equal(WorkLogUserType.Employee, currentUser.UserType);
        Assert.Equal(WorkLogUserRole.Admin, currentUser.Role);
        Assert.Equal(employeeId, currentUser.EmployeeId);
        Assert.True(currentUser.IsAdmin);
        Assert.True(currentUser.IsEmployee);
        Assert.False(currentUser.IsCustomer);
    }

    [Fact]
    public void CurrentUser_CustomerIsNotAdmin()
    {
        var customerId = Guid.NewGuid();
        var currentUser = CreateCurrentUser(new[]
        {
            new Claim(WorkLogClaimTypes.UserType, WorkLogUserType.Customer.ToString()),
            new Claim(WorkLogClaimTypes.Role, WorkLogUserRole.Customer.ToString()),
            new Claim(WorkLogClaimTypes.CustomerId, customerId.ToString())
        });

        Assert.False(currentUser.IsAdmin);
        Assert.False(currentUser.IsEmployee);
        Assert.True(currentUser.IsCustomer);
        Assert.Equal(customerId, currentUser.CustomerId);
    }

    private static CurrentUser CreateCurrentUser(IEnumerable<Claim> claims)
    {
        var accessor = new HttpContextAccessor
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"))
            }
        };

        return new CurrentUser(accessor);
    }
}
