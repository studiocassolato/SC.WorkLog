using System;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Application.DTO.WorkLogUsers
{
    public class WorkLogUserDetailDto
    {
        public Guid Id { get; set; }
        public string Email { get; set; }
        public string CognitoSub { get; set; }
        public WorkLogUserType UserType { get; set; }
        public WorkLogUserRole Role { get; set; }
        public Guid? EmployeeId { get; set; }
        public string EmployeeName { get; set; }
        public Guid? CustomerId { get; set; }
        public string CustomerName { get; set; }
        public string DisplayName { get; set; }
        public bool Active { get; set; }
    }
}
