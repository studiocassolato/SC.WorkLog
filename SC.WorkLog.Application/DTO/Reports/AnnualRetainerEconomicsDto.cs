using System;
using System.Collections.Generic;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Application.DTO.Reports
{
    public class AnnualRetainerEconomicsDto
    {
        public Guid ContractPeriodId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public decimal Amount { get; set; }
        public decimal ApprovedHours { get; set; }
        public decimal InternalValueUsed { get; set; }
        public decimal Balance { get; set; }
        public decimal ConsumptionPercentage { get; set; }
        public RetainerPeriodStatus Status { get; set; }
        public List<RetainerMonthlyRowDto> MonthlyRows { get; set; }
    }
}
