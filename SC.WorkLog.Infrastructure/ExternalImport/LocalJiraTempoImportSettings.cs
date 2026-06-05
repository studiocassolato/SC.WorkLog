namespace SC.WorkLog.Infrastructure.ExternalImport
{
    public class LocalJiraTempoImportSettings
    {
        public string JiraBaseUrl { get; set; } = "https://studiocassolato.atlassian.net";
        public string JiraEmail { get; set; } = "CHANGE-ME";
        public string JiraApiToken { get; set; } = "CHANGE-ME";
        public string TempoBaseUrl { get; set; } = "https://api.tempo.io";
        public string TempoApiToken { get; set; } = "CHANGE-ME";
        public string RequestParticipantsFieldId { get; set; }
        public string OrganizationsFieldId { get; set; }
        public string PortalOnlyCustomersCsvPath { get; set; } = "Data/portal-only-customers.csv";
        public string AtlassianUsersCsvPath { get; set; } = "Data/export-users.csv";
    }
}
