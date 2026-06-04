using System;

namespace SC.WorkLog.Application.DTO.Reports
{
    public class MonthlyInternalValueDto
    {
        public DateTime Month { get; set; }
        public decimal ApprovedHours { get; set; }
        public decimal InternalValue { get; set; }
    }
}
