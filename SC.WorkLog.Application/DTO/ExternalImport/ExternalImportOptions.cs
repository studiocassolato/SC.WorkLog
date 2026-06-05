using System;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Application.DTO.ExternalImport
{
    public class ExternalImportOptions
    {
        public ExternalImportMode Mode { get; set; } = ExternalImportMode.Full;
        public bool DryRun { get; set; }
        public string IssueKey { get; set; }
        public int? Max { get; set; }
        public DateTime? Since { get; set; }
    }
}
