using System;
using System.Collections.Generic;

namespace SC.WorkLog.Domain.ValueObjects
{
    public class TimeEntryJiraMetadata
    {
        public string TempoWorklogId { get; set; }
        public string JiraWorklogId { get; set; }
        public string IssueId { get; set; }
        public string IssueKey { get; set; }
        public string AuthorAccountId { get; set; }
        public string AuthorDisplayName { get; set; }
        public string AuthorEmail { get; set; }
        public DateTime StartedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public int TimeSpentSeconds { get; set; }
        public DateTime ImportedAt { get; set; }
        public DateTime LastSeenAt { get; set; }
        public List<string> ImportWarnings { get; set; } = new List<string>();
        public string RawFieldsJson { get; set; }
    }
}
