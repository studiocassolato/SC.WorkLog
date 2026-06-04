namespace SC.WorkLog.Domain.DomainServices.Results
{
    public class FixedPriceEconomicsResult
    {
        public decimal ApprovedHours { get; private set; }
        public decimal InternalValueUsed { get; private set; }
        public decimal BudgetConsumptionPercentage { get; private set; }
        public decimal EffectiveHourlyAverage { get; private set; }
        public decimal RemainingTheoreticalMargin { get; private set; }
        public bool OverBudget { get; private set; }

        public FixedPriceEconomicsResult(decimal approvedHours, decimal internalValueUsed, decimal budgetConsumptionPercentage, decimal effectiveHourlyAverage, decimal remainingTheoreticalMargin, bool overBudget)
        {
            ApprovedHours = approvedHours;
            InternalValueUsed = internalValueUsed;
            BudgetConsumptionPercentage = budgetConsumptionPercentage;
            EffectiveHourlyAverage = effectiveHourlyAverage;
            RemainingTheoreticalMargin = remainingTheoreticalMargin;
            OverBudget = overBudget;
        }
    }
}
