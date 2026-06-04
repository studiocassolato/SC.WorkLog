using System;

namespace SC.WorkLog.Application.DTO.TimeEntries
{
    public class TimeEntryFilter
    {
        public Guid? EmployeeId { get; set; }
        public Guid? ProjectId { get; set; }
        public Guid? WorkItemId { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
    }
}
