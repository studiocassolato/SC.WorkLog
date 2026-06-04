using System;

namespace SC.WorkLog.Domain.DomainServices.Results
{
    public class MonthlyInternalValueRow
    {
        public DateTime Month { get; private set; }
        public decimal ApprovedHours { get; private set; }
        public decimal InternalValue { get; private set; }

        public MonthlyInternalValueRow(DateTime month, decimal approvedHours, decimal internalValue)
        {
            Month = new DateTime(month.Year, month.Month, 1);
            ApprovedHours = approvedHours;
            InternalValue = internalValue;
        }
    }
}
