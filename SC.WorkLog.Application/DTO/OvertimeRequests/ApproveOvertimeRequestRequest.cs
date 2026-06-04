using System;

namespace SC.WorkLog.Application.DTO.OvertimeRequests
{
    public class ApproveOvertimeRequestRequest
    {
        public Guid Id { get; set; }
        public decimal ApprovedHours { get; set; }
        public string AdminNote { get; set; }
    }
}
