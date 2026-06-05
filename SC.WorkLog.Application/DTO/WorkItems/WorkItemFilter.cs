using System;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Application.DTO.WorkItems
{
    public class WorkItemFilter
    {
        public string Search { get; set; }
        public Guid? ProjectId { get; set; }
        public Guid? CustomerId { get; set; }
        public string AssigneeId { get; set; }
        public bool UnassignedOnly { get; set; }
        public string StatusKey { get; set; }
        public WorkItemStatusTypology? StatusTypology { get; set; }
        public WorkItemPriority? Priority { get; set; }
        public bool IncludeClosed { get; set; }
    }
}
