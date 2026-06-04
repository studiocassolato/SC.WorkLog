namespace SC.WorkLog.Application.DTO.Reports
{
    public class ProjectEconomicsDto
    {
        public System.Collections.Generic.List<AnnualRetainerEconomicsDto> AnnualRetainerPeriods { get; set; }
        public TimeAndMaterialEconomicsDto TimeAndMaterial { get; set; }
        public FixedPriceEconomicsDto FixedPrice { get; set; }
        public AnnualRetainerEconomicsDto AnnualRetainer { get; set; }
        public InternalProjectEconomicsDto Internal { get; set; }
    }
}
