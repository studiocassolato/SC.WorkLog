namespace SC.WorkLog.Application.DTO.Reports
{
    public class FixedPriceEconomicsDto
    {
        public decimal FixedAmount { get; set; }
        public decimal ApprovedHours { get; set; }
        public decimal InternalValueUsed { get; set; }
        public decimal BudgetConsumptionPercentage { get; set; }
        public decimal EffectiveHourlyAverage { get; set; }
        public decimal RemainingTheoreticalMargin { get; set; }
        public bool OverBudget { get; set; }
    }
}
