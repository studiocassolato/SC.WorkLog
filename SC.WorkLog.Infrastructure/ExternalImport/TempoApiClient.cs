using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.Tasks;

namespace SC.WorkLog.Infrastructure.ExternalImport
{
    public class TempoApiClient : ITempoApiClient
    {
        private readonly LocalJiraTempoImportSettings _settings;

        public TempoApiClient(LocalJiraTempoImportSettings settings)
        {
            _settings = settings;
        }

        public async Task<ExternalImportPage<TempoWorklogImportDto>> GetWorklogsAsync(string projectKey, DateTime? updatedSince, string issueKey, DateTime? startedFrom, int maxResults, string pageToken)
        {
            using (var client = CreateClient())
            {
                var offset = int.TryParse(pageToken, out var parsedOffset) ? parsedOffset : 0;
                var from = (startedFrom ?? updatedSince ?? DateTime.UtcNow.AddYears(-10)).Date;
                var to = DateTime.UtcNow.Date.AddDays(1);
                var url = string.Concat("/4/worklogs?from=", from.ToString("yyyy-MM-dd"),
                    "&to=", to.ToString("yyyy-MM-dd"),
                    "&limit=", maxResults,
                    "&offset=", offset);
                var response = await client.GetAsync(url);
                await EnsureReadSuccess(response);
                using (var stream = await response.Content.ReadAsStreamAsync())
                using (var document = await JsonDocument.ParseAsync(stream))
                {
                    var root = document.RootElement;
                    var results = root.TryGetProperty("results", out var resultsElement) && resultsElement.ValueKind == JsonValueKind.Array
                        ? resultsElement.EnumerateArray().Select(MapWorklog).ToList()
                        : new List<TempoWorklogImportDto>();
                    if (!string.IsNullOrWhiteSpace(issueKey))
                        results = results.Where(x => string.Equals(x.IssueKey, issueKey, StringComparison.OrdinalIgnoreCase)).ToList();
                    if (updatedSince.HasValue)
                        results = results.Where(x => !x.UpdatedAt.HasValue || x.UpdatedAt.Value >= updatedSince.Value).ToList();

                    var metadata = root.TryGetProperty("metadata", out var metadataElement) ? metadataElement : default;
                    var count = metadata.ValueKind == JsonValueKind.Object ? GetInt(metadata, "count") : results.Count;
                    return new ExternalImportPage<TempoWorklogImportDto>
                    {
                        Items = results,
                        HasMore = results.Count > 0 && offset + results.Count < count,
                        NextPageToken = (offset + maxResults).ToString(),
                        RateLimitSummary = RateLimitSummary(response)
                    };
                }
            }
        }

        public async Task<ExternalImportPage<TempoWorklogImportDto>> GetIssueWorklogsAsync(string issueId, DateTime? updatedSince, DateTime? startedFrom, int maxResults, string pageToken)
        {
            using (var client = CreateClient())
            {
                var offset = int.TryParse(pageToken, out var parsedOffset) ? parsedOffset : 0;
                var url = string.Concat("/4/worklogs/issue/", Uri.EscapeDataString(issueId),
                    "?limit=", maxResults,
                    "&offset=", offset);
                var response = await client.GetAsync(url);
                await EnsureReadSuccess(response);
                using (var stream = await response.Content.ReadAsStreamAsync())
                using (var document = await JsonDocument.ParseAsync(stream))
                {
                    var root = document.RootElement;
                    var results = root.TryGetProperty("results", out var resultsElement) && resultsElement.ValueKind == JsonValueKind.Array
                        ? resultsElement.EnumerateArray().Select(MapWorklog).ToList()
                        : new List<TempoWorklogImportDto>();
                    foreach (var worklog in results.Where(x => string.IsNullOrWhiteSpace(x.IssueId)))
                        worklog.IssueId = issueId;
                    if (startedFrom.HasValue)
                        results = results.Where(x => x.StartedAt >= startedFrom.Value.Date).ToList();
                    if (updatedSince.HasValue)
                        results = results.Where(x => !x.UpdatedAt.HasValue || x.UpdatedAt.Value >= updatedSince.Value).ToList();

                    var metadata = root.TryGetProperty("metadata", out var metadataElement) ? metadataElement : default;
                    var count = metadata.ValueKind == JsonValueKind.Object ? GetInt(metadata, "count") : results.Count;
                    return new ExternalImportPage<TempoWorklogImportDto>
                    {
                        Items = results,
                        HasMore = results.Count > 0 && offset + results.Count < count,
                        NextPageToken = (offset + maxResults).ToString(),
                        RateLimitSummary = RateLimitSummary(response)
                    };
                }
            }
        }

        private HttpClient CreateClient()
        {
            var client = new HttpClient { BaseAddress = new Uri(_settings.TempoBaseUrl.TrimEnd('/')) };
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _settings.TempoApiToken);
            client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            return client;
        }

        private static TempoWorklogImportDto MapWorklog(JsonElement worklog)
        {
            var issue = worklog.TryGetProperty("issue", out var issueElement) ? issueElement : default;
            var author = worklog.TryGetProperty("author", out var authorElement) ? authorElement : default;
            return new TempoWorklogImportDto
            {
                TempoWorklogId = GetString(worklog, "tempoWorklogId") ?? GetString(worklog, "id"),
                JiraWorklogId = GetString(worklog, "jiraWorklogId"),
                IssueId = GetString(issue, "id"),
                IssueKey = GetString(issue, "key"),
                Author = MapPerson(author),
                StartedAt = GetDate(worklog, "startDate").GetValueOrDefault(),
                UpdatedAt = GetDate(worklog, "updatedAt"),
                TimeSpentSeconds = GetInt(worklog, "timeSpentSeconds"),
                Description = GetString(worklog, "description"),
                RawFieldsJson = worklog.GetRawText()
            };
        }

        private static ExternalImportPersonDto MapPerson(JsonElement person)
        {
            if (person.ValueKind != JsonValueKind.Object)
                return null;
            return new ExternalImportPersonDto
            {
                AccountId = GetString(person, "accountId"),
                DisplayName = GetString(person, "displayName"),
                Email = GetString(person, "email")
            };
        }

        private static async Task EnsureReadSuccess(HttpResponseMessage response)
        {
            if (response.IsSuccessStatusCode)
                return;
            var retryAfter = response.Headers.RetryAfter?.Delta?.ToString();
            var detail = string.IsNullOrWhiteSpace(retryAfter) ? response.ReasonPhrase : string.Concat(response.ReasonPhrase, " Retry-After: ", retryAfter);
            throw new ArgumentException($"Tempo read failed: {(int)response.StatusCode} {detail}");
        }

        private static string RateLimitSummary(HttpResponseMessage response)
        {
            if (response.Headers.TryGetValues("X-RateLimit-Remaining", out var remaining))
                return string.Concat("Tempo remaining: ", remaining.FirstOrDefault(), ".");
            return null;
        }

        private static string GetString(JsonElement element, string property)
        {
            return element.ValueKind == JsonValueKind.Object && element.TryGetProperty(property, out var value) && value.ValueKind != JsonValueKind.Null ? value.ToString() : null;
        }

        private static int GetInt(JsonElement element, string property)
        {
            return element.ValueKind == JsonValueKind.Object && element.TryGetProperty(property, out var value) && value.TryGetInt32(out var number) ? number : 0;
        }

        private static DateTime? GetDate(JsonElement element, string property)
        {
            var value = GetString(element, property);
            return DateTime.TryParse(value, out var date) ? date.ToUniversalTime() : (DateTime?)null;
        }
    }
}
