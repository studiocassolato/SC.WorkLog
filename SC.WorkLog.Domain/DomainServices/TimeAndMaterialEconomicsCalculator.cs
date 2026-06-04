using System;
using System.Collections.Generic;
using System.Linq;
using SC.WorkLog.Domain.AggregateRoots;
using SC.WorkLog.Domain.DomainServices.Results;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Domain.DomainServices
{
    public static class TimeAndMaterialEconomicsCalculator
    {
        public static TimeAndMaterialEconomicsResult Calculate(Project project, IEnumerable<WorkItem> workItems, IEnumerable<TimeEntry> timeEntries, IEnumerable<ProjectPayment> payments)
        {
            project.EnsureCanHavePayments();

            var projectEntries = WorkLogCalculationHelpers.GetProjectTimeEntries(project, workItems, timeEntries);
            var projectPayments = (payments ?? Enumerable.Empty<ProjectPayment>())
                .Where(x => x.ProjectId == project.Id)
                .ToList();

            var approvedHours = projectEntries.Sum(x => x.ApprovedTime);
            var workedValue = projectEntries.Sum(x => x.ApprovedTime * x.ProjectRateSnapshot);
            var totalPaymentsReceived = projectPayments.Sum(x => x.Amount);
            var currentBalance = totalPaymentsReceived - workedValue;

            return new TimeAndMaterialEconomicsResult(
                approvedHours,
                workedValue,
                totalPaymentsReceived,
                currentBalance,
                GetBalanceStatus(currentBalance),
                BuildMonthlyRows(projectEntries, projectPayments));
        }

        private static TimeAndMaterialBalanceStatus GetBalanceStatus(decimal balance)
        {
            if (balance > 0)
                return TimeAndMaterialBalanceStatus.CreditAvailable;

            if (balance < 0)
                return TimeAndMaterialBalanceStatus.OverCredit;

            return TimeAndMaterialBalanceStatus.Balanced;
        }

        private static IReadOnlyList<MonthlyTimeAndMaterialBalanceRow> BuildMonthlyRows(IReadOnlyList<TimeEntry> timeEntries, IReadOnlyList<ProjectPayment> payments)
        {
            if (!timeEntries.Any() && !payments.Any())
                return new List<MonthlyTimeAndMaterialBalanceRow>();

            var minDate = timeEntries.Select(x => x.Date)
                .Concat(payments.Select(x => x.PaymentDate))
                .Min();
            var maxDate = timeEntries.Select(x => x.Date)
                .Concat(payments.Select(x => x.PaymentDate))
                .Max();

            var rows = new List<MonthlyTimeAndMaterialBalanceRow>();
            var cumulativePayments = 0m;
            var cumulativeWorkedValue = 0m;

            foreach (var month in WorkLogCalculationHelpers.GetMonths(minDate, maxDate))
            {
                var monthlyEntries = timeEntries.Where(x => WorkLogCalculationHelpers.GetMonth(x.Date) == month).ToList();
                var monthlyPayments = payments.Where(x => WorkLogCalculationHelpers.GetMonth(x.PaymentDate) == month).ToList();
                var approvedHours = monthlyEntries.Sum(x => x.ApprovedTime);
                var workedValue = monthlyEntries.Sum(x => x.ApprovedTime * x.ProjectRateSnapshot);
                var paymentsReceived = monthlyPayments.Sum(x => x.Amount);

                cumulativePayments += paymentsReceived;
                cumulativeWorkedValue += workedValue;

                rows.Add(new MonthlyTimeAndMaterialBalanceRow(
                    month,
                    approvedHours,
                    workedValue,
                    paymentsReceived,
                    paymentsReceived - workedValue,
                    cumulativePayments - cumulativeWorkedValue));
            }

            return rows;
        }
    }
}
