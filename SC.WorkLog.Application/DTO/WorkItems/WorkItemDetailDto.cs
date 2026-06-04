using System;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Application.DTO.WorkItems
{
    public class WorkItemDetailDto
    {
        public Guid Id { get; set; }
        public string Code { get; set; }
        public Guid ProjectId { get; set; }
        public string ProjectName { get; set; }
        public Guid CustomerId { get; set; }
        public string CustomerName { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string StatusKey { get; set; }
        public string StatusName { get; set; }
        public WorkItemStatusTypology StatusTypology { get; set; }
        public string CustomerDisplayName { get; set; }
        public bool IsClosed { get; set; }
        public WorkItemPriority Priority { get; set; }
        public Guid? AssigneeId { get; set; }
        public string AssigneeName { get; set; }
        public WorkItemOrigin Origin { get; set; }
        public string ExternalReference { get; set; }
        public DateTime OpeningDate { get; set; }
        public DateTime? ClosingDate { get; set; }
        public bool IsPriority { get; set; }
        public decimal LoggedHours { get; set; }
        public decimal? ApprovedHours { get; set; }
    }
}
