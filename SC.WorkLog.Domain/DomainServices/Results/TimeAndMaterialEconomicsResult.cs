using System.Collections.Generic;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Domain.DomainServices.Results
{
    public class TimeAndMaterialEconomicsResult
    {
        public decimal ApprovedHours { get; private set; }
        public decimal WorkedValue { get; private set; }
        public decimal TotalPaymentsReceived { get; private set; }
        public decimal CurrentBalance { get; private set; }
        public TimeAndMaterialBalanceStatus BalanceStatus { get; private set; }
        public IReadOnlyList<MonthlyTimeAndMaterialBalanceRow> MonthlyRows { get; private set; }

        public TimeAndMaterialEconomicsResult(decimal approvedHours, decimal workedValue, decimal totalPaymentsReceived, decimal currentBalance, TimeAndMaterialBalanceStatus balanceStatus, IReadOnlyList<MonthlyTimeAndMaterialBalanceRow> monthlyRows)
        {
            ApprovedHours = approvedHours;
            WorkedValue = workedValue;
            TotalPaymentsReceived = totalPaymentsReceived;
            CurrentBalance = currentBalance;
            BalanceStatus = balanceStatus;
            MonthlyRows = monthlyRows;
        }
    }
}
