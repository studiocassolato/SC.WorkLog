namespace SC.WorkLog.Infrastructure.ExternalImport
{
    public class ExternalImportPersonDto
    {
        public string AccountId { get; set; }
        public string DisplayName { get; set; }
        public string Email { get; set; }
        public string PortalCustomerFullName { get; set; }
        public bool? PortalCustomerActive { get; set; }
        public string PortalCustomerLastLogin { get; set; }
        public bool PortalCustomerMatchedFromCsv { get; set; }
    }
}
