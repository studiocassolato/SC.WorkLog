using System;

namespace SC.WorkLog.Infrastructure.ExternalImport
{
    public class TempoWorklogImportDto
    {
        public string TempoWorklogId { get; set; }
        public string JiraWorklogId { get; set; }
        public string IssueId { get; set; }
        public string IssueKey { get; set; }
        public ExternalImportPersonDto Author { get; set; }
        public DateTime StartedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public int TimeSpentSeconds { get; set; }
        public string Description { get; set; }
        public string RawFieldsJson { get; set; }
    }
}
