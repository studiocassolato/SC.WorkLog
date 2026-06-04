using System;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Application.DTO.OvertimeRequests
{
    public class OvertimeRequestFilter
    {
        public Guid? EmployeeId { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
        public RequestStatus? Status { get; set; }
    }
}
