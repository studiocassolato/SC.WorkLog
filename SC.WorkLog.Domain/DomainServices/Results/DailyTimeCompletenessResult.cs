using System;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Domain.DomainServices.Results
{
    public class DailyTimeCompletenessResult
    {
        public Guid EmployeeId { get; private set; }
        public DateTime Date { get; private set; }
        public decimal WorkItemHours { get; private set; }
        public decimal LeaveHours { get; private set; }
        public decimal DailyTotal { get; private set; }
        public decimal ExpectedDailyHours { get; private set; }
        public decimal MissingHours { get; private set; }
        public decimal OvertimeHours { get; private set; }
        public DailyTimeCompletenessStatus Status { get; private set; }

        public DailyTimeCompletenessResult(Guid employeeId, DateTime date, decimal workItemHours, decimal leaveHours, decimal dailyTotal, decimal expectedDailyHours, decimal missingHours, decimal overtimeHours, DailyTimeCompletenessStatus status)
        {
            EmployeeId = employeeId;
            Date = date.Date;
            WorkItemHours = workItemHours;
            LeaveHours = leaveHours;
            DailyTotal = dailyTotal;
            ExpectedDailyHours = expectedDailyHours;
            MissingHours = missingHours;
            OvertimeHours = overtimeHours;
            Status = status;
        }
    }
}
