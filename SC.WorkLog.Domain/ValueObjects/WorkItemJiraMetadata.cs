using System;
using System.Collections.Generic;

namespace SC.WorkLog.Domain.ValueObjects
{
    public class WorkItemJiraMetadata
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
        public string ReporterAccountId { get; set; }
        public string ReporterDisplayName { get; set; }
        public string ReporterEmail { get; set; }
        public string ReporterPortalCustomerFullName { get; set; }
        public bool? ReporterPortalCustomerActive { get; set; }
        public string ReporterPortalCustomerLastLogin { get; set; }
        public bool ReporterPortalCustomerMatchedFromCsv { get; set; }
        public string AssigneeAccountId { get; set; }
        public string AssigneeDisplayName { get; set; }
        public string AssigneeEmail { get; set; }
        public string AssigneePortalCustomerFullName { get; set; }
        public bool? AssigneePortalCustomerActive { get; set; }
        public string AssigneePortalCustomerLastLogin { get; set; }
        public bool AssigneePortalCustomerMatchedFromCsv { get; set; }
        public List<JiraParticipantInfo> RequestParticipants { get; set; } = new List<JiraParticipantInfo>();
        public List<JiraOrganizationInfo> Organizations { get; set; } = new List<JiraOrganizationInfo>();
        public string CustomerDomainDetected { get; set; }
        public DateTime ImportedAt { get; set; }
        public DateTime LastSeenAt { get; set; }
        public DateTime? RawUpdatedAt { get; set; }
        public DateTime? RawCreatedAt { get; set; }
        public List<string> ImportWarnings { get; set; } = new List<string>();
        public string RawFieldsJson { get; set; }
    }
}
