using System;

namespace SC.WorkLog.Application.DTO.Reports
{
    public class RetainerMonthlyRowDto
    {
        public DateTime Month { get; set; }
        public decimal ApprovedHours { get; set; }
        public decimal InternalValue { get; set; }
        public decimal CumulativeInternalValue { get; set; }
        public decimal ExpectedCumulativeValue { get; set; }
        public decimal Delta { get; set; }
    }
}
