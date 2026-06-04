using System;
using SC.WorkLog.Domain.DomainServices;
using SC.WorkLog.Domain.ValueObjects;

namespace SC.WorkLog.Domain.AggregateRoots
{
    public class WorkItemComment : AggregateRoot
    {
        public Guid WorkItemId { get; private set; }
        public Guid EmployeeId { get; private set; }
        public string Content { get; private set; }
        public bool IsInternal { get; private set; }
        public DateTime CreatedAt { get; private set; }

        private WorkItemComment()
        {
        }

        public WorkItemComment(Guid workItemId, Guid employeeId, string content, bool isInternal, string currentUser)
        {
            WorkLogDomainValidation.Required(workItemId, nameof(WorkItemId));
            WorkLogDomainValidation.Required(employeeId, nameof(EmployeeId));
            WorkLogDomainValidation.Required(content, nameof(Content));
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));

            WorkItemId = workItemId;
            EmployeeId = employeeId;
            Content = content.Trim();
            IsInternal = isInternal;
            CreatedAt = DateTime.UtcNow;
            AuditInfo = new AuditInfo(currentUser);
        }
    }
}
