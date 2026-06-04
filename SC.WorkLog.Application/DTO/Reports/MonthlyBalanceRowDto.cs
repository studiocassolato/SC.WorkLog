using System;

namespace SC.WorkLog.Application.DTO.Reports
{
    public class MonthlyBalanceRowDto
    {
        public DateTime Month { get; set; }
        public decimal ApprovedHours { get; set; }
        public decimal WorkedValue { get; set; }
        public decimal PaymentsReceived { get; set; }
        public decimal MonthlyBalance { get; set; }
        public decimal CumulativeBalance { get; set; }
    }
}
