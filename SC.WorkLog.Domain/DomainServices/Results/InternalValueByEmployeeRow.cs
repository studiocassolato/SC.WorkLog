using System;

namespace SC.WorkLog.Domain.DomainServices.Results
{
    public class InternalValueByEmployeeRow
    {
        public Guid EmployeeId { get; private set; }
        public decimal ApprovedHours { get; private set; }
        public decimal InternalValue { get; private set; }

        public InternalValueByEmployeeRow(Guid employeeId, decimal approvedHours, decimal internalValue)
        {
            EmployeeId = employeeId;
            ApprovedHours = approvedHours;
            InternalValue = internalValue;
        }
    }
}
