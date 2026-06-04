namespace SC.WorkLog.Application.DTO.Projects
{
    public class ProjectCapabilitiesDto
    {
        public bool CanViewEconomics { get; set; }
        public bool CanViewPayments { get; set; }
        public bool CanViewContractPeriods { get; set; }
        public bool CanEditProjectSettings { get; set; }
    }
}
