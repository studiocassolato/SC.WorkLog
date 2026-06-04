using System;

namespace SC.WorkLog.Application.DTO.WorkItems
{
    public class AddWorkItemCommentRequest
    {
        public Guid WorkItemId { get; set; }
        public string Content { get; set; }
        public bool IsInternal { get; set; }
    }
}
