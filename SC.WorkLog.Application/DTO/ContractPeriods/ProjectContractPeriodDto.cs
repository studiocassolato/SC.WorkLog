using System;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Application.DTO.ContractPeriods
{
    public class ProjectContractPeriodDto
    {
        public Guid Id { get; set; }
        public Guid ProjectId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public decimal Amount { get; set; }
        public DateTime? PaymentDate { get; set; }
        public string Note { get; set; }
        public decimal InternalValueUsed { get; set; }
        public decimal ApprovedHours { get; set; }
        public decimal Balance { get; set; }
        public decimal ConsumptionPercentage { get; set; }
        public RetainerPeriodStatus Status { get; set; }
    }
}
