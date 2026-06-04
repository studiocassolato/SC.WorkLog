using System;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Application.DTO.WorkItems
{
    public class CreateWorkItemRequest
    {
        public string Code { get; set; }
        public Guid ProjectId { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string StatusKey { get; set; }
        public WorkItemPriority Priority { get; set; }
        public Guid? AssigneeId { get; set; }
        public WorkItemOrigin Origin { get; set; }
        public string ExternalReference { get; set; }
        public DateTime OpeningDate { get; set; }
        public DateTime? ClosingDate { get; set; }
        public bool IsPriority { get; set; }
    }
}
