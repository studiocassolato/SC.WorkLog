using System;

namespace SC.WorkLog.Application.DTO.LeaveRequests
{
    public class ApproveLeaveRequestRequest
    {
        public Guid Id { get; set; }
        public string AdminNote { get; set; }
    }
}
