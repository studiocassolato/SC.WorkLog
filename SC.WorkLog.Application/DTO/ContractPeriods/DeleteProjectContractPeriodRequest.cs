using System;

namespace SC.WorkLog.Application.DTO.ContractPeriods
{
    public class DeleteProjectContractPeriodRequest
    {
        public Guid ProjectId { get; set; }
        public Guid ContractPeriodId { get; set; }
    }
}
