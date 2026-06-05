namespace SC.WorkLog.Domain.ValueObjects
{
    public class JiraParticipantInfo
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
