using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace SC.WorkLog.Infrastructure.ExternalImport
{
    public class JiraApiClient : IJiraApiClient
    {
        private readonly LocalJiraTempoImportSettings _settings;
        private readonly Lazy<PortalOnlyCustomerDirectory> _portalOnlyCustomers;
        private readonly Lazy<AtlassianUserDirectory> _atlassianUsers;

        public JiraApiClient(LocalJiraTempoImportSettings settings)
        {
            _settings = settings;
            _portalOnlyCustomers = new Lazy<PortalOnlyCustomerDirectory>(() => PortalOnlyCustomerDirectory.Load(_settings.PortalOnlyCustomersCsvPath));
            _atlassianUsers = new Lazy<AtlassianUserDirectory>(() => AtlassianUserDirectory.Load(_settings.AtlassianUsersCsvPath));
        }

        public async Task<ExternalImportPage<JiraIssueImportDto>> GetSupportIssuesAsync(string projectKey, DateTime? updatedSince, string issueKey, string pageToken, int maxResults)
        {
            using (var client = await CreateAuthenticatedClientAsync(projectKey, issueKey))
            {
                var jql = string.IsNullOrWhiteSpace(issueKey) ? $"project = {projectKey}" : $"project = {projectKey} AND key = {issueKey}";
                if (updatedSince.HasValue && string.IsNullOrWhiteSpace(issueKey))
                    jql = string.Concat(jql, " AND updated >= \"", updatedSince.Value.ToString("yyyy-MM-dd HH:mm"), "\"");
                jql = string.Concat(jql, " ORDER BY updated ASC");

                var fields = "summary,description,status,priority,reporter,assignee,created,updated,resolutiondate,issuetype,project";
                if (!string.IsNullOrWhiteSpace(_settings.RequestParticipantsFieldId))
                    fields = string.Concat(fields, ",", _settings.RequestParticipantsFieldId);
                if (!string.IsNullOrWhiteSpace(_settings.OrganizationsFieldId))
                    fields = string.Concat(fields, ",", _settings.OrganizationsFieldId);

                var url = string.Concat("rest/api/3/search/jql?jql=", Uri.EscapeDataString(jql),
                    "&maxResults=", maxResults,
                    "&fields=", Uri.EscapeDataString(fields));
                if (!string.IsNullOrWhiteSpace(pageToken))
                    url = string.Concat(url, "&nextPageToken=", Uri.EscapeDataString(pageToken));
                var response = await client.GetAsync(url);
                await EnsureReadSuccess(response);
                var responseContent = await response.Content.ReadAsStringAsync();
                using (var document = JsonDocument.Parse(responseContent))
                {
                    var root = document.RootElement;
                    var issues = root.TryGetProperty("issues", out var issuesElement) && issuesElement.ValueKind == JsonValueKind.Array
                        ? issuesElement.EnumerateArray().Select(MapIssue).ToList()
                        : new List<JiraIssueImportDto>();
                    var nextPageToken = GetString(root, "nextPageToken");
                    return new ExternalImportPage<JiraIssueImportDto>
                    {
                        Items = issues,
                        HasMore = !string.IsNullOrWhiteSpace(nextPageToken),
                        NextPageToken = nextPageToken,
                        RateLimitSummary = RateLimitSummary(response)
                    };
                }
            }
        }

        public async Task<ExternalImportPersonDto> GetUserAsync(string accountId)
        {
            if (string.IsNullOrWhiteSpace(accountId))
                return null;
            var csvPerson = MapAtlassianUser(accountId);
            if (csvPerson != null)
                return csvPerson;

            using (var client = await CreateAuthenticatedClientAsync("SUPPORT", null))
            {
                var response = await client.GetAsync(string.Concat("rest/api/3/user?accountId=", Uri.EscapeDataString(accountId)));
                await EnsureReadSuccess(response);
                using (var stream = await response.Content.ReadAsStreamAsync())
                using (var document = await JsonDocument.ParseAsync(stream))
                    return MapPerson(document.RootElement);
            }
        }

        private HttpClient CreateClient()
        {
            var client = new HttpClient { BaseAddress = new Uri(string.Concat(_settings.JiraBaseUrl.TrimEnd('/'), "/")) };
            var token = Convert.ToBase64String(Encoding.UTF8.GetBytes(string.Concat(_settings.JiraEmail, ":", _settings.JiraApiToken)));
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", token);
            client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            return client;
        }

        private async Task<HttpClient> CreateAuthenticatedClientAsync(string projectKey, string issueKey)
        {
            var directClient = CreateClient();
            var response = await directClient.GetAsync("rest/api/3/myself");
            if (response.IsSuccessStatusCode)
                return directClient;

            var gatewayClient = await CreateGatewayClientAsync();
            var projectResponse = await gatewayClient.GetAsync(string.Concat("rest/api/3/project/", Uri.EscapeDataString(projectKey)));
            if (projectResponse.IsSuccessStatusCode)
            {
                directClient.Dispose();
                return gatewayClient;
            }

            gatewayClient.Dispose();
            directClient.Dispose();
            throw new ArgumentException($"Jira authentication failed: {(int)response.StatusCode} {response.ReasonPhrase}. Verify JiraEmail, JiraApiToken and JiraBaseUrl.");
        }

        private async Task<HttpClient> CreateGatewayClientAsync()
        {
            var cloudId = await GetCloudIdAsync();
            var client = new HttpClient { BaseAddress = new Uri(string.Concat("https://api.atlassian.com/ex/jira/", cloudId, "/")) };
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _settings.JiraApiToken);
            client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            return client;
        }

        private async Task<string> GetCloudIdAsync()
        {
            using (var tenantClient = new HttpClient { BaseAddress = new Uri(string.Concat(_settings.JiraBaseUrl.TrimEnd('/'), "/")) })
            {
                var tenantResponse = await tenantClient.GetAsync("_edge/tenant_info");
                var tenantContent = await tenantResponse.Content.ReadAsStringAsync();
                if (tenantResponse.IsSuccessStatusCode && TryParseJson(tenantContent, out var tenantDocument))
                {
                    using (tenantDocument)
                    {
                        var cloudId = GetString(tenantDocument.RootElement, "cloudId");
                        if (!string.IsNullOrWhiteSpace(cloudId))
                            return cloudId;
                    }
                }
            }
            throw new ArgumentException("Jira cloudId discovery failed. Verify JiraBaseUrl.");
        }

        private JiraIssueImportDto MapIssue(JsonElement issue)
        {
            var fields = issue.GetProperty("fields");
            var usedFallback = false;
            var description = fields.TryGetProperty("description", out var descriptionElement)
                ? ConvertDescription(descriptionElement, out usedFallback)
                : null;
            return new JiraIssueImportDto
            {
                IssueId = GetString(issue, "id"),
                IssueKey = GetString(issue, "key"),
                IssueSelfUrl = GetString(issue, "self"),
                ProjectKey = GetNestedString(fields, "project", "key"),
                IssueType = GetNestedString(fields, "issuetype", "name"),
                StatusName = GetNestedString(fields, "status", "name"),
                StatusId = GetNestedString(fields, "status", "id"),
                StatusCategory = fields.TryGetProperty("status", out var status) ? GetNestedString(status, "statusCategory", "name") : null,
                PriorityName = GetNestedString(fields, "priority", "name"),
                PriorityId = GetNestedString(fields, "priority", "id"),
                Summary = GetString(fields, "summary"),
                DescriptionHtml = description,
                DescriptionUsedFallback = usedFallback,
                Reporter = MapPerson(GetPropertyOrNull(fields, "reporter")),
                Assignee = MapPerson(GetPropertyOrNull(fields, "assignee")),
                RequestParticipants = MapParticipants(fields),
                Organizations = MapOrganizations(fields),
                CreatedAt = GetDate(fields, "created").GetValueOrDefault(),
                UpdatedAt = GetDate(fields, "updated").GetValueOrDefault(),
                ResolvedAt = GetDate(fields, "resolutiondate"),
                RawFieldsJson = fields.GetRawText()
            };
        }

        private List<ExternalImportPersonDto> MapParticipants(JsonElement fields)
        {
            if (string.IsNullOrWhiteSpace(_settings.RequestParticipantsFieldId))
                return new List<ExternalImportPersonDto>();
            if (!fields.TryGetProperty(_settings.RequestParticipantsFieldId, out var participants) || participants.ValueKind != JsonValueKind.Array)
                return new List<ExternalImportPersonDto>();
            return participants.EnumerateArray().Select(x => MapPerson(x)).Where(x => x != null).ToList();
        }

        private List<ExternalImportOrganizationDto> MapOrganizations(JsonElement fields)
        {
            if (string.IsNullOrWhiteSpace(_settings.OrganizationsFieldId))
                return new List<ExternalImportOrganizationDto>();
            if (!fields.TryGetProperty(_settings.OrganizationsFieldId, out var organizations) || organizations.ValueKind != JsonValueKind.Array)
                return new List<ExternalImportOrganizationDto>();
            return organizations.EnumerateArray()
                .Select(x => new ExternalImportOrganizationDto { Id = GetString(x, "id"), Name = GetString(x, "name") })
                .Where(x => !string.IsNullOrWhiteSpace(x.Id) || !string.IsNullOrWhiteSpace(x.Name))
                .ToList();
        }

        private ExternalImportPersonDto MapPerson(JsonElement? person)
        {
            if (!person.HasValue || person.Value.ValueKind == JsonValueKind.Null || person.Value.ValueKind == JsonValueKind.Undefined)
                return null;
            var dto = new ExternalImportPersonDto
            {
                AccountId = GetString(person.Value, "accountId"),
                DisplayName = GetString(person.Value, "displayName"),
                Email = GetString(person.Value, "emailAddress")
            };
            EnrichFromPortalCustomerCsv(dto);
            EnrichFromAtlassianUsersCsv(dto);
            return dto;
        }

        private void EnrichFromPortalCustomerCsv(ExternalImportPersonDto person)
        {
            if (person == null || string.IsNullOrWhiteSpace(person.AccountId))
                return;

            var portalCustomer = _portalOnlyCustomers.Value.FindByAccountId(person.AccountId);
            if (portalCustomer == null)
                return;

            person.PortalCustomerFullName = portalCustomer.FullName;
            person.PortalCustomerActive = portalCustomer.Active;
            person.PortalCustomerLastLogin = portalCustomer.LastLogin;
            person.PortalCustomerMatchedFromCsv = true;
            if (string.IsNullOrWhiteSpace(person.Email))
                person.Email = portalCustomer.Email;
            if (string.IsNullOrWhiteSpace(person.DisplayName))
                person.DisplayName = portalCustomer.FullName;
        }

        private void EnrichFromAtlassianUsersCsv(ExternalImportPersonDto person)
        {
            if (person == null || string.IsNullOrWhiteSpace(person.AccountId))
                return;

            var user = _atlassianUsers.Value.FindByAccountId(person.AccountId);
            if (user == null)
                return;

            if (string.IsNullOrWhiteSpace(person.Email))
                person.Email = user.Email;
            if (string.IsNullOrWhiteSpace(person.DisplayName))
                person.DisplayName = user.DisplayName;
        }

        private ExternalImportPersonDto MapAtlassianUser(string accountId)
        {
            var user = _atlassianUsers.Value.FindByAccountId(accountId);
            return user == null
                ? null
                : new ExternalImportPersonDto { AccountId = user.AccountId, DisplayName = user.DisplayName, Email = user.Email };
        }

        private static string ConvertDescription(JsonElement element, out bool usedFallback)
        {
            usedFallback = false;
            if (element.ValueKind == JsonValueKind.String)
                return WebUtility.HtmlEncode(element.GetString());
            if (element.ValueKind == JsonValueKind.Null || element.ValueKind == JsonValueKind.Undefined)
                return null;

            try
            {
                return ConvertAdfNode(element);
            }
            catch
            {
                usedFallback = true;
                return WebUtility.HtmlEncode(element.GetRawText());
            }
        }

        private static string ConvertAdfNode(JsonElement node)
        {
            var type = GetString(node, "type");
            if (type == "text")
                return WebUtility.HtmlEncode(GetString(node, "text"));
            if (type == "hardBreak")
                return "<br />";

            var children = node.TryGetProperty("content", out var content) && content.ValueKind == JsonValueKind.Array
                ? string.Concat(content.EnumerateArray().Select(ConvertAdfNode))
                : string.Empty;
            if (type == "paragraph")
                return string.Concat("<p>", children, "</p>");
            if (type == "heading")
                return string.Concat("<h3>", children, "</h3>");
            if (type == "bulletList")
                return string.Concat("<ul>", children, "</ul>");
            if (type == "orderedList")
                return string.Concat("<ol>", children, "</ol>");
            if (type == "listItem")
                return string.Concat("<li>", children, "</li>");
            if (type == "blockquote")
                return string.Concat("<blockquote>", children, "</blockquote>");
            if (type == "codeBlock")
                return string.Concat("<pre><code>", children, "</code></pre>");
            return children;
        }

        private static async Task EnsureReadSuccess(HttpResponseMessage response)
        {
            if (response.IsSuccessStatusCode)
                return;
            var retryAfter = response.Headers.RetryAfter?.Delta?.ToString();
            var detail = string.IsNullOrWhiteSpace(retryAfter) ? response.ReasonPhrase : string.Concat(response.ReasonPhrase, " Retry-After: ", retryAfter);
            throw new ArgumentException($"Jira read failed: {(int)response.StatusCode} {detail}");
        }

        private static string RateLimitSummary(HttpResponseMessage response)
        {
            if (response.Headers.TryGetValues("X-RateLimit-Remaining", out var remaining))
                return string.Concat("Jira remaining: ", remaining.FirstOrDefault(), ".");
            return null;
        }

        private static JsonElement? GetPropertyOrNull(JsonElement element, string property)
        {
            return element.TryGetProperty(property, out var value) ? value : (JsonElement?)null;
        }

        private static string GetString(JsonElement element, string property)
        {
            return element.TryGetProperty(property, out var value) && value.ValueKind != JsonValueKind.Null ? value.ToString() : null;
        }

        private static string GetNestedString(JsonElement element, string property, string nestedProperty)
        {
            return element.TryGetProperty(property, out var value) && value.ValueKind == JsonValueKind.Object ? GetString(value, nestedProperty) : null;
        }

        private static bool TryParseJson(string content, out JsonDocument document)
        {
            try
            {
                document = JsonDocument.Parse(content);
                return true;
            }
            catch (JsonException)
            {
                document = null;
                return false;
            }
        }

        private static DateTime? GetDate(JsonElement element, string property)
        {
            var value = GetString(element, property);
            return DateTime.TryParse(value, out var date) ? date.ToUniversalTime() : (DateTime?)null;
        }
    }
}
