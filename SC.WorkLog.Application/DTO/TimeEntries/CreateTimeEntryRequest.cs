using System;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Application.DTO.TimeEntries
{
    public class CreateTimeEntryRequest
    {
        public Guid EmployeeId { get; set; }
        public Guid WorkItemId { get; set; }
        public DateTime Date { get; set; }
        public decimal Time { get; set; }
        public string Description { get; set; }
        public string Notes { get; set; }
    }
}
