using System;

namespace SC.WorkLog.Application.DTO.Reports
{
    public class InternalValueByEmployeeDto
    {
        public Guid EmployeeId { get; set; }
        public decimal ApprovedHours { get; set; }
        public decimal InternalValue { get; set; }
    }
}
