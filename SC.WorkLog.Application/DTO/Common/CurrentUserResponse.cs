using System;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Application.DTO.Common
{
    public class CurrentUserResponse
    {
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
