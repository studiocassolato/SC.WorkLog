using System;
using System.Collections.Generic;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Application.DTO.ExternalImport
{
    public class ExternalImportResult
    {
        public ExternalImportSource Source { get; set; }
        public string ProjectKey { get; set; }
        public ExternalImportMode Mode { get; set; }
        public bool DryRun { get; set; }
        public DateTime? PreviousLastSuccessfulSync { get; set; }
        public DateTime? NewLastSuccessfulSync { get; set; }
        public int TotalFetched { get; set; }
        public int CreatedCount { get; set; }
        public int UpdatedCount { get; set; }
        public int SkippedCount { get; set; }
        public int ErrorCount { get; set; }
        public List<string> Warnings { get; set; } = new List<string>();
        public List<string> Errors { get; set; } = new List<string>();
        public List<string> UnmappedStatuses { get; set; } = new List<string>();
        public List<string> UnknownCustomers { get; set; } = new List<string>();
        public List<string> MissingDefaultProjects { get; set; } = new List<string>();
        public List<string> MissingEmployees { get; set; } = new List<string>();
        public string RateLimitSummary { get; set; }

        public bool HasWarnings => Warnings.Count > 0 || UnmappedStatuses.Count > 0 || UnknownCustomers.Count > 0 || MissingDefaultProjects.Count > 0 || MissingEmployees.Count > 0;
    }
}
