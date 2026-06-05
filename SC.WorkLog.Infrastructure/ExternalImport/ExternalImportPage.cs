using System.Collections.Generic;

namespace SC.WorkLog.Infrastructure.ExternalImport
{
    public class ExternalImportPage<T>
    {
        public List<T> Items { get; set; } = new List<T>();
        public bool HasMore { get; set; }
        public int NextStartAt { get; set; }
        public string NextPageToken { get; set; }
        public string RateLimitSummary { get; set; }
    }
}
