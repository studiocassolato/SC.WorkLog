using System;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Application.DTO.LeaveRequests
{
    public class CreateLeaveRequestRequest
    {
        public Guid EmployeeId { get; set; }
        public LeaveRequestType Type { get; set; }
        public DateTime Date { get; set; }
        public decimal Hours { get; set; }
        public string EmployeeNote { get; set; }
    }
}
