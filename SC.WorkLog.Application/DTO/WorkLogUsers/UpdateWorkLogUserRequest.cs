using System;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Application.DTO.WorkLogUsers
{
    public class UpdateWorkLogUserRequest
    {
        public Guid Id { get; set; }
        public string Email { get; set; }
        public WorkLogUserType UserType { get; set; }
        public WorkLogUserRole Role { get; set; }
        public Guid? EmployeeId { get; set; }
        public Guid? CustomerId { get; set; }
        public string DisplayName { get; set; }
        public bool Active { get; set; }
    }
}
