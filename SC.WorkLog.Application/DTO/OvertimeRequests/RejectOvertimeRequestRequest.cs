using System;

namespace SC.WorkLog.Application.DTO.OvertimeRequests
{
    public class RejectOvertimeRequestRequest
    {
        public Guid Id { get; set; }
        public string AdminNote { get; set; }
    }
}
