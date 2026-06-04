using System.Collections.Generic;
using System.Linq;
using SC.WorkLog.Domain.AggregateRoots;
using SC.WorkLog.Domain.DomainServices.Results;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Domain.DomainServices
{
    public static class FixedPriceEconomicsCalculator
    {
        public static FixedPriceEconomicsResult Calculate(Project project, IEnumerable<WorkItem> workItems, IEnumerable<TimeEntry> timeEntries)
        {
            if (project.PaymentType != ProjectPaymentType.FixedPrice)
                throw new System.ArgumentException("Fixed price economics can only be calculated for Fixed price projects.");

            var projectEntries = WorkLogCalculationHelpers.GetProjectTimeEntries(project, workItems, timeEntries);
            var approvedHours = projectEntries.Sum(x => x.ApprovedTime);
            var internalValueUsed = projectEntries.Sum(x => x.ApprovedTime * x.EmployeeDefaultRateSnapshot);
            var fixedAmount = project.FixedAmount.GetValueOrDefault();
            var budgetConsumption = fixedAmount > 0 ? internalValueUsed / fixedAmount : 0;
            var effectiveHourlyAverage = approvedHours > 0 ? fixedAmount / approvedHours : 0;
            var remainingTheoreticalMargin = fixedAmount - internalValueUsed;

            return new FixedPriceEconomicsResult(
                approvedHours,
                internalValueUsed,
                budgetConsumption,
                effectiveHourlyAverage,
                remainingTheoreticalMargin,
                internalValueUsed > fixedAmount);
        }
    }
}
