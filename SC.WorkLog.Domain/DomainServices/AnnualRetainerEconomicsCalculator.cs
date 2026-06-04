using System;
using System.Collections.Generic;
using System.Linq;
using SC.WorkLog.Domain.AggregateRoots;
using SC.WorkLog.Domain.DomainServices.Results;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Domain.DomainServices
{
    public static class AnnualRetainerEconomicsCalculator
    {
        public static IReadOnlyList<RetainerPeriodEconomicsResult> Calculate(Project project, IEnumerable<ProjectContractPeriod> contractPeriods, IEnumerable<WorkItem> workItems, IEnumerable<TimeEntry> timeEntries)
        {
            project.EnsureCanHaveContractPeriods();

            var projectEntries = WorkLogCalculationHelpers.GetProjectTimeEntries(project, workItems, timeEntries);

            return (contractPeriods ?? Enumerable.Empty<ProjectContractPeriod>())
                .Where(x => x.ProjectId == project.Id)
                .OrderBy(x => x.StartDate)
                .Select(x => CalculatePeriod(x, projectEntries))
                .ToList();
        }

        public static ProjectContractPeriod FindActiveContractPeriod(IEnumerable<ProjectContractPeriod> contractPeriods, DateTime date)
        {
            return (contractPeriods ?? Enumerable.Empty<ProjectContractPeriod>())
                .Where(x => x.Includes(date))
                .OrderByDescending(x => x.StartDate)
                .FirstOrDefault();
        }

        public static RetainerPeriodEconomicsResult CalculatePeriod(ProjectContractPeriod contractPeriod, IEnumerable<TimeEntry> projectTimeEntries)
        {
            var periodEntries = (projectTimeEntries ?? Enumerable.Empty<TimeEntry>())
                .Where(x => contractPeriod.Includes(x.Date))
                .ToList();

            var approvedHours = periodEntries.Sum(x => x.ApprovedTime);
            var internalValueUsed = periodEntries.Sum(x => x.ApprovedTime * x.EmployeeDefaultRateSnapshot);
            var balance = contractPeriod.Amount - internalValueUsed;
            var consumptionPercentage = contractPeriod.Amount > 0 ? internalValueUsed / contractPeriod.Amount : 0;

            return new RetainerPeriodEconomicsResult(
                contractPeriod.Id,
                contractPeriod.StartDate,
                contractPeriod.EndDate,
                contractPeriod.Amount,
                approvedHours,
                internalValueUsed,
                balance,
                consumptionPercentage,
                GetStatus(balance),
                BuildMonthlyRows(contractPeriod, periodEntries));
        }

        private static RetainerPeriodStatus GetStatus(decimal balance)
        {
            if (balance > 0)
                return RetainerPeriodStatus.Healthy;

            if (balance < 0)
                return RetainerPeriodStatus.OverRetainer;

            return RetainerPeriodStatus.Balanced;
        }

        private static IReadOnlyList<RetainerMonthlyRow> BuildMonthlyRows(ProjectContractPeriod contractPeriod, IReadOnlyList<TimeEntry> periodEntries)
        {
            var months = WorkLogCalculationHelpers.GetMonths(contractPeriod.StartDate, contractPeriod.EndDate);
            var expectedMonthlyValue = months.Count > 0 ? contractPeriod.Amount / months.Count : 0;
            var rows = new List<RetainerMonthlyRow>();
            var cumulativeInternalValue = 0m;
            var monthIndex = 0;

            foreach (var month in months)
            {
                monthIndex++;
                var monthEntries = periodEntries.Where(x => WorkLogCalculationHelpers.GetMonth(x.Date) == month).ToList();
                var approvedHours = monthEntries.Sum(x => x.ApprovedTime);
                var internalValue = monthEntries.Sum(x => x.ApprovedTime * x.EmployeeDefaultRateSnapshot);
                cumulativeInternalValue += internalValue;
                var expectedCumulativeValue = expectedMonthlyValue * monthIndex;

                rows.Add(new RetainerMonthlyRow(
                    month,
                    approvedHours,
                    internalValue,
                    cumulativeInternalValue,
                    expectedCumulativeValue,
                    expectedCumulativeValue - cumulativeInternalValue));
            }

            return rows;
        }
    }
}
