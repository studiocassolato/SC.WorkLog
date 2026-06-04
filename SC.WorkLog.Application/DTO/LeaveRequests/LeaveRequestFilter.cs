using System;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Application.DTO.LeaveRequests
{
    public class LeaveRequestFilter
    {
        public Guid? EmployeeId { get; set; }
        public LeaveRequestType? Type { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
        public RequestStatus? Status { get; set; }
    }
}
