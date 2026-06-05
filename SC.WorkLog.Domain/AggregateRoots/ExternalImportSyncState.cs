using System;
using System.Collections.Generic;
using SC.WorkLog.Domain.DomainServices;
using SC.WorkLog.Domain.Enums;
using SC.WorkLog.Domain.ValueObjects;

namespace SC.WorkLog.Domain.AggregateRoots
{
    public class ExternalImportSyncState : AggregateRoot
    {
        public ExternalImportSource Source { get; private set; }
        public string ProjectKey { get; private set; }
        public ExternalImportMode Mode { get; private set; }
        public DateTime LastStartedAt { get; private set; }
        public DateTime? LastCompletedAt { get; private set; }
        public DateTime? LastSuccessfulSyncAt { get; private set; }
        public ExternalImportStatus Status { get; private set; }
        public string LastError { get; private set; }
        public List<string> LastWarnings { get; private set; } = new List<string>();
        public DateTime? LastIssueUpdatedAtImported { get; private set; }
        public DateTime? LastWorklogUpdatedAtImported { get; private set; }
        public int TotalFetched { get; private set; }
        public int CreatedCount { get; private set; }
        public int UpdatedCount { get; private set; }
        public int SkippedCount { get; private set; }
        public int ErrorCount { get; private set; }

        private ExternalImportSyncState()
        {
        }

        public ExternalImportSyncState(ExternalImportSource source, string projectKey, string currentUser)
        {
            WorkLogDomainValidation.Required(projectKey, nameof(ProjectKey));
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));

            Source = source;
            ProjectKey = projectKey.Trim().ToUpperInvariant();
            AuditInfo = new AuditInfo(currentUser);
        }

        public void MarkRunning(ExternalImportMode mode, DateTime startedAt, string currentUser)
        {
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));

            Mode = mode;
            LastStartedAt = startedAt;
            LastCompletedAt = null;
            Status = ExternalImportStatus.Running;
            LastError = null;
            LastWarnings = new List<string>();
            TotalFetched = 0;
            CreatedCount = 0;
            UpdatedCount = 0;
            SkippedCount = 0;
            ErrorCount = 0;
            AuditInfo.Update(currentUser);
        }

        public void MarkCompleted(ExternalImportStatus status, DateTime completedAt, ExternalImportCounters counters, IEnumerable<string> warnings, string error, DateTime? lastSourceTimestamp, string currentUser)
        {
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));

            Status = status;
            LastCompletedAt = completedAt;
            LastWarnings = warnings == null ? new List<string>() : new List<string>(warnings);
            LastError = error;
            TotalFetched = counters?.TotalFetched ?? 0;
            CreatedCount = counters?.CreatedCount ?? 0;
            UpdatedCount = counters?.UpdatedCount ?? 0;
            SkippedCount = counters?.SkippedCount ?? 0;
            ErrorCount = counters?.ErrorCount ?? 0;

            if (status == ExternalImportStatus.Succeeded || status == ExternalImportStatus.SucceededWithWarnings)
                LastSuccessfulSyncAt = completedAt;

            if (lastSourceTimestamp.HasValue)
            {
                if (Source == ExternalImportSource.JiraIssues)
                    LastIssueUpdatedAtImported = lastSourceTimestamp;
                else if (Source == ExternalImportSource.TempoWorklogs)
                    LastWorklogUpdatedAtImported = lastSourceTimestamp;
            }

            AuditInfo.Update(currentUser);
        }
    }
}
