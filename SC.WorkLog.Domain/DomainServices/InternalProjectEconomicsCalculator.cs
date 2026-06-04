using System.Collections.Generic;
using System.Linq;
using SC.WorkLog.Domain.AggregateRoots;
using SC.WorkLog.Domain.DomainServices.Results;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Domain.DomainServices
{
    public static class InternalProjectEconomicsCalculator
    {
        public static InternalProjectEconomicsResult Calculate(Project project, IEnumerable<WorkItem> workItems, IEnumerable<TimeEntry> timeEntries)
        {
            if (project.PaymentType != ProjectPaymentType.Internal)
                throw new System.ArgumentException("Internal project economics can only be calculated for Internal projects.");

            var projectEntries = WorkLogCalculationHelpers.GetProjectTimeEntries(project, workItems, timeEntries);
            var approvedHours = projectEntries.Sum(x => x.ApprovedTime);
            var internalValue = projectEntries.Sum(x => x.ApprovedTime * x.EmployeeDefaultRateSnapshot);

            var byEmployee = projectEntries
                .GroupBy(x => x.EmployeeId)
                .Select(x => new InternalValueByEmployeeRow(
                    x.Key,
                    x.Sum(e => e.ApprovedTime),
                    x.Sum(e => e.ApprovedTime * e.EmployeeDefaultRateSnapshot)))
                .OrderBy(x => x.EmployeeId)
                .ToList();

            var monthlyRows = projectEntries
                .GroupBy(x => WorkLogCalculationHelpers.GetMonth(x.Date))
                .OrderBy(x => x.Key)
                .Select(x => new MonthlyInternalValueRow(
                    x.Key,
                    x.Sum(e => e.ApprovedTime),
                    x.Sum(e => e.ApprovedTime * e.EmployeeDefaultRateSnapshot)))
                .ToList();

            return new InternalProjectEconomicsResult(approvedHours, internalValue, byEmployee, monthlyRows);
        }
    }
}
