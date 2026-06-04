using Microsoft.AspNetCore.Http;
using SC.WorkLog.Domain.Constants;
using SC.WorkLog.Domain.Enums;
using SC.WorkLog.Domain.Interfaces;
using System;
using System.Security.Claims;

namespace SC.WorkLog.WebApp.Models
{
    public class CurrentUser : ICurrentUser
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public CurrentUser(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public string UserName => Name ?? Email ?? Subject ?? "anonymous";
        public string Subject => GetClaim(ClaimTypes.NameIdentifier) ?? GetClaim("sub");
        public string Email => GetClaim(ClaimTypes.Email) ?? GetClaim("email");
        public string Name => GetClaim(ClaimTypes.Name) ?? GetClaim("name");
        public Guid? WorkLogUserId => TryGetGuid(GetClaim(WorkLogClaimTypes.WorkLogUserId));
        public WorkLogUserType UserType => Enum.TryParse<WorkLogUserType>(GetClaim(WorkLogClaimTypes.UserType), true, out var value) ? value : WorkLogUserType.Employee;
        public WorkLogUserRole Role => Enum.TryParse<WorkLogUserRole>(GetClaim(WorkLogClaimTypes.Role), true, out var value) ? value : WorkLogUserRole.Employee;
        public Guid? EmployeeId => TryGetGuid(GetClaim(WorkLogClaimTypes.EmployeeId));
        public Guid? CustomerId => TryGetGuid(GetClaim(WorkLogClaimTypes.CustomerId));
        public bool IsAuthenticated => _httpContextAccessor.HttpContext?.User?.Identity?.IsAuthenticated ?? false;
        public bool IsAdmin => UserType == WorkLogUserType.Employee && Role == WorkLogUserRole.Admin;
        public bool IsEmployee => UserType == WorkLogUserType.Employee;
        public bool IsCustomer => UserType == WorkLogUserType.Customer;

        private string GetClaim(string claimType)
        {
            return _httpContextAccessor.HttpContext?.User?.FindFirstValue(claimType) ?? string.Empty;
        }

        private static Guid? TryGetGuid(string value)
        {
            return Guid.TryParse(value, out var parsed) ? parsed : null;
        }
    }
}
