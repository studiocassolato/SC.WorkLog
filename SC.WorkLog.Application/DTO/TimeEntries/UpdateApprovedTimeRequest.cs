using System;

namespace SC.WorkLog.Application.DTO.TimeEntries
{
    public class UpdateApprovedTimeRequest
    {
        public Guid Id { get; set; }
        public decimal ApprovedTime { get; set; }
        public string AdminNote { get; set; }
    }
}
