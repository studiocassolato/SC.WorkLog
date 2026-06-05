using System;
using System.Collections.Generic;

namespace SC.WorkLog.Infrastructure.ExternalImport
{
    public class JiraIssueImportDto
    {
        public string IssueId { get; set; }
        public string IssueKey { get; set; }
        public string IssueSelfUrl { get; set; }
        public string ProjectKey { get; set; }
        public string IssueType { get; set; }
        public string StatusName { get; set; }
        public string StatusId { get; set; }
        public string StatusCategory { get; set; }
        public string PriorityName { get; set; }
        public string PriorityId { get; set; }
        public string Summary { get; set; }
        public string DescriptionHtml { get; set; }
        public bool DescriptionUsedFallback { get; set; }
        public ExternalImportPersonDto Reporter { get; set; }
        public ExternalImportPersonDto Assignee { get; set; }
        public List<ExternalImportPersonDto> RequestParticipants { get; set; } = new List<ExternalImportPersonDto>();
        public List<ExternalImportOrganizationDto> Organizations { get; set; } = new List<ExternalImportOrganizationDto>();
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public string RawFieldsJson { get; set; }
    }
}
