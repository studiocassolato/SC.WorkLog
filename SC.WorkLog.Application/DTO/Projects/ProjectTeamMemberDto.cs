using System;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Application.DTO.Projects
{
    public class ProjectTeamMemberDto
    {
        public Guid EmployeeId { get; set; }
        public string FullName { get; set; }
        public EmployeeLevel? Level { get; set; }
        public decimal LoggedHours { get; set; }
        public decimal ApprovedHours { get; set; }
    }
}
