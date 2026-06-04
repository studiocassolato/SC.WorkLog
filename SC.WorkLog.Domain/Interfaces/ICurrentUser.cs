using System;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Domain.Interfaces
{
    public interface ICurrentUser
    {
        string UserName { get; }
        string Subject { get; }
        string Email { get; }
        string Name { get; }
        Guid? WorkLogUserId { get; }
        WorkLogUserType UserType { get; }
        WorkLogUserRole Role { get; }
        Guid? EmployeeId { get; }
        Guid? CustomerId { get; }
        bool IsAuthenticated { get; }
        bool IsAdmin { get; }
        bool IsEmployee { get; }
        bool IsCustomer { get; }
    }
}
