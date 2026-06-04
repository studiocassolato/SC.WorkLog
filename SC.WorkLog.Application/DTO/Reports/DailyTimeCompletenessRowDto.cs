using System;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Application.DTO.Reports
{
    public class DailyTimeCompletenessRowDto
    {
        public Guid EmployeeId { get; set; }
        public string EmployeeName { get; set; }
        public DateTime Date { get; set; }
        public decimal WorkItemHours { get; set; }
        public decimal LeaveHours { get; set; }
        public decimal DailyTotal { get; set; }
        public decimal ExpectedDailyHours { get; set; }
        public decimal MissingHours { get; set; }
        public decimal OvertimeHours { get; set; }
        public DailyTimeCompletenessStatus Status { get; set; }
    }
}
