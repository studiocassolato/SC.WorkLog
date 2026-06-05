using System;
using System.Threading.Tasks;

namespace SC.WorkLog.Infrastructure.ExternalImport
{
    public interface ITempoApiClient
    {
        Task<ExternalImportPage<TempoWorklogImportDto>> GetWorklogsAsync(string projectKey, DateTime? updatedSince, string issueKey, DateTime? startedFrom, int maxResults, string pageToken);
        Task<ExternalImportPage<TempoWorklogImportDto>> GetIssueWorklogsAsync(string issueId, DateTime? updatedSince, DateTime? startedFrom, int maxResults, string pageToken);
    }
}
