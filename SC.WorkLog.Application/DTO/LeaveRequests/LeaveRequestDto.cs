using System;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Application.DTO.LeaveRequests
{
    public class LeaveRequestDto
    {
        public Guid Id { get; set; }
        public Guid EmployeeId { get; set; }
        public string EmployeeName { get; set; }
        public LeaveRequestType Type { get; set; }
        public DateTime Date { get; set; }
        public decimal Hours { get; set; }
        public RequestStatus Status { get; set; }
        public DateTime RequestDate { get; set; }
        public string EmployeeNote { get; set; }
        public string AdminNote { get; set; }
    }
}
