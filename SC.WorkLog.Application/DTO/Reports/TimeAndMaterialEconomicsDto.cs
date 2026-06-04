using System.Collections.Generic;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Application.DTO.Reports
{
    public class TimeAndMaterialEconomicsDto
    {
        public decimal ApprovedHours { get; set; }
        public decimal WorkedValue { get; set; }
        public decimal TotalPaymentsReceived { get; set; }
        public decimal CurrentBalance { get; set; }
        public TimeAndMaterialBalanceStatus BalanceStatus { get; set; }
        public List<MonthlyBalanceRowDto> MonthlyRows { get; set; }
    }
}
