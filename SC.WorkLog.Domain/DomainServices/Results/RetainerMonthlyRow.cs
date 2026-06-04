using System;

namespace SC.WorkLog.Domain.DomainServices.Results
{
    public class RetainerMonthlyRow
    {
        public DateTime Month { get; private set; }
        public decimal ApprovedHours { get; private set; }
        public decimal InternalValue { get; private set; }
        public decimal CumulativeInternalValue { get; private set; }
        public decimal ExpectedCumulativeValue { get; private set; }
        public decimal Delta { get; private set; }

        public RetainerMonthlyRow(DateTime month, decimal approvedHours, decimal internalValue, decimal cumulativeInternalValue, decimal expectedCumulativeValue, decimal delta)
        {
            Month = new DateTime(month.Year, month.Month, 1);
            ApprovedHours = approvedHours;
            InternalValue = internalValue;
            CumulativeInternalValue = cumulativeInternalValue;
            ExpectedCumulativeValue = expectedCumulativeValue;
            Delta = delta;
        }
    }
}
