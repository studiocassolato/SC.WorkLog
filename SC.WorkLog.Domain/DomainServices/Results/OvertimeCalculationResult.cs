using System;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Domain.DomainServices.Results
{
    public class OvertimeCalculationResult
    {
        public Guid EmployeeId { get; private set; }
        public DateTime Date { get; private set; }
        public bool OvertimeRequired { get; private set; }
        public decimal CalculatedOvertimeHours { get; private set; }
        public OvertimeCalculationAction SuggestedAction { get; private set; }

        public OvertimeCalculationResult(Guid employeeId, DateTime date, bool overtimeRequired, decimal calculatedOvertimeHours, OvertimeCalculationAction suggestedAction)
        {
            EmployeeId = employeeId;
            Date = date.Date;
            OvertimeRequired = overtimeRequired;
            CalculatedOvertimeHours = calculatedOvertimeHours;
            SuggestedAction = suggestedAction;
        }
    }
}
