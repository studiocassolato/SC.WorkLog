using System;

namespace SC.WorkLog.Application.DTO.ContractPeriods
{
    public class UpdateProjectContractPeriodRequest
    {
        public Guid Id { get; set; }
        public Guid ProjectId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public decimal Amount { get; set; }
        public DateTime? PaymentDate { get; set; }
        public string Note { get; set; }
    }
}
