using System;

namespace SC.WorkLog.Application.DTO.Common
{
    public class WorkLogUserContext
    {
        public Guid UserId { get; set; }
        public Guid EmployeeId { get; set; }
        public string Email { get; set; }
        public ApplicationUserRole Role { get; set; }

        public bool IsAdmin()
        {
            return Role == ApplicationUserRole.Admin;
        }
    }
}
