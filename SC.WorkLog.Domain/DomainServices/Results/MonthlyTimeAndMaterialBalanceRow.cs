using System;

namespace SC.WorkLog.Domain.DomainServices.Results
{
    public class MonthlyTimeAndMaterialBalanceRow
    {
        public DateTime Month { get; private set; }
        public decimal ApprovedHours { get; private set; }
        public decimal WorkedValue { get; private set; }
        public decimal PaymentsReceived { get; private set; }
        public decimal MonthlyBalance { get; private set; }
        public decimal CumulativeBalance { get; private set; }

        public MonthlyTimeAndMaterialBalanceRow(DateTime month, decimal approvedHours, decimal workedValue, decimal paymentsReceived, decimal monthlyBalance, decimal cumulativeBalance)
        {
            Month = new DateTime(month.Year, month.Month, 1);
            ApprovedHours = approvedHours;
            WorkedValue = workedValue;
            PaymentsReceived = paymentsReceived;
            MonthlyBalance = monthlyBalance;
            CumulativeBalance = cumulativeBalance;
        }
    }
}
