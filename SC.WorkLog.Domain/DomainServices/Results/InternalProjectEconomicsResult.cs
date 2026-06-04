using System.Collections.Generic;

namespace SC.WorkLog.Domain.DomainServices.Results
{
    public class InternalProjectEconomicsResult
    {
        public decimal ApprovedHours { get; private set; }
        public decimal InternalValue { get; private set; }
        public IReadOnlyList<InternalValueByEmployeeRow> InternalValueByEmployee { get; private set; }
        public IReadOnlyList<MonthlyInternalValueRow> MonthlyInternalValue { get; private set; }

        public InternalProjectEconomicsResult(decimal approvedHours, decimal internalValue, IReadOnlyList<InternalValueByEmployeeRow> internalValueByEmployee, IReadOnlyList<MonthlyInternalValueRow> monthlyInternalValue)
        {
            ApprovedHours = approvedHours;
            InternalValue = internalValue;
            InternalValueByEmployee = internalValueByEmployee;
            MonthlyInternalValue = monthlyInternalValue;
        }
    }
}
