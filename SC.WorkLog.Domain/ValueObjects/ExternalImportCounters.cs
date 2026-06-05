namespace SC.WorkLog.Domain.ValueObjects
{
    public class ExternalImportCounters
    {
        public int TotalFetched { get; set; }
        public int CreatedCount { get; set; }
        public int UpdatedCount { get; set; }
        public int SkippedCount { get; set; }
        public int ErrorCount { get; set; }
    }
}
