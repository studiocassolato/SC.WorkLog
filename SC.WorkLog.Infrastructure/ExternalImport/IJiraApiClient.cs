using System;
using System.Threading.Tasks;

namespace SC.WorkLog.Infrastructure.ExternalImport
{
    public interface IJiraApiClient
    {
        Task<ExternalImportPage<JiraIssueImportDto>> GetSupportIssuesAsync(string projectKey, DateTime? updatedSince, string issueKey, string pageToken, int maxResults);
        Task<ExternalImportPersonDto> GetUserAsync(string accountId);
    }
}
