using System;
using System.Collections.Generic;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Domain.DomainServices.Results
{
    public class RetainerPeriodEconomicsResult
    {
        public Guid ContractPeriodId { get; private set; }
        public DateTime StartDate { get; private set; }
        public DateTime EndDate { get; private set; }
        public decimal Amount { get; private set; }
        public decimal ApprovedHours { get; private set; }
        public decimal InternalValueUsed { get; private set; }
        public decimal Balance { get; private set; }
        public decimal ConsumptionPercentage { get; private set; }
        public RetainerPeriodStatus Status { get; private set; }
        public IReadOnlyList<RetainerMonthlyRow> MonthlyRows { get; private set; }

        public RetainerPeriodEconomicsResult(Guid contractPeriodId, DateTime startDate, DateTime endDate, decimal amount, decimal approvedHours, decimal internalValueUsed, decimal balance, decimal consumptionPercentage, RetainerPeriodStatus status, IReadOnlyList<RetainerMonthlyRow> monthlyRows)
        {
            ContractPeriodId = contractPeriodId;
            StartDate = startDate.Date;
            EndDate = endDate.Date;
            Amount = amount;
            ApprovedHours = approvedHours;
            InternalValueUsed = internalValueUsed;
            Balance = balance;
            ConsumptionPercentage = consumptionPercentage;
            Status = status;
            MonthlyRows = monthlyRows;
        }
    }
}
