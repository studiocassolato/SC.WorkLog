using System;
using SC.WorkLog.Domain.Enums;

using System.Collections.Generic;
using SC.WorkLog.Application.DTO.Customers;
using SC.WorkLog.Application.DTO.Reports;

namespace SC.WorkLog.Application.DTO.Projects
{
    public class ProjectDetailDto
    {
        public Guid Id { get; set; }
        public Guid CustomerId { get; set; }
        public CustomerListItemDto Customer { get; set; }
        public string Name { get; set; }
        public ProjectPaymentType PaymentType { get; set; }
        public ProjectStatus Status { get; set; }
        public string Notes { get; set; }
        public decimal? JuniorRate { get; set; }
        public decimal? MidRate { get; set; }
        public decimal? SeniorRate { get; set; }
        public decimal? FixedAmount { get; set; }
        public List<ProjectMilestoneDto> Milestones { get; set; }
        public ProjectHoursSummaryDto HoursSummary { get; set; }
        public ProjectWorkItemSummaryDto WorkItemSummary { get; set; }
        public List<ProjectTeamMemberDto> TeamSummary { get; set; }
        public ProjectEconomicsDto EconomicsSummary { get; set; }
        public ProjectCapabilitiesDto Capabilities { get; set; }
    }
}
