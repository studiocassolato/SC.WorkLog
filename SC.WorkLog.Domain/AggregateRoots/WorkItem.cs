using System;
using SC.WorkLog.Domain.DomainServices;
using SC.WorkLog.Domain.Enums;
using SC.WorkLog.Domain.ValueObjects;

namespace SC.WorkLog.Domain.AggregateRoots
{
    public class WorkItem : AggregateRoot
    {
        public string Code { get; private set; }
        public Guid ProjectId { get; private set; }
        public string Title { get; private set; }
        public string Description { get; private set; }
        public string StatusKey { get; private set; }
        public WorkItemPriority Priority { get; private set; }
        public Guid? AssigneeId { get; private set; }
        public WorkItemOrigin Origin { get; private set; }
        public string ExternalReference { get; private set; }
        public DateTime OpeningDate { get; private set; }
        public DateTime? ClosingDate { get; private set; }
        public bool IsPriority { get; private set; }

        private WorkItem()
        {
        }

        public WorkItem(string code, Guid projectId, string title, string description, string statusKey, WorkItemPriority priority, Guid? assigneeId, WorkItemOrigin origin, string externalReference, DateTime openingDate, bool isPriority, string currentUser)
        {
            WorkLogDomainValidation.Required(projectId, nameof(ProjectId));
            WorkLogDomainValidation.Required(title, nameof(Title));
            WorkLogDomainValidation.Required(statusKey, nameof(StatusKey));
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));

            Code = code?.Trim();
            ProjectId = projectId;
            Title = title.Trim();
            Description = description;
            StatusKey = StatusConfig.NormalizeKey(statusKey);
            Priority = priority;
            AssigneeId = assigneeId;
            Origin = origin;
            ExternalReference = externalReference?.Trim();
            OpeningDate = openingDate.Date;
            IsPriority = isPriority;
            AuditInfo = new AuditInfo(currentUser);
        }

        public void ChangeStatus(string statusKey, DateTime? closingDate, string currentUser)
        {
            WorkLogDomainValidation.Required(statusKey, nameof(StatusKey));
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));

            StatusKey = StatusConfig.NormalizeKey(statusKey);
            ClosingDate = closingDate?.Date;
            AuditInfo.Update(currentUser);
        }

        public void UpdateDetails(string title, string description, WorkItemPriority priority, Guid? assigneeId, bool isPriority, string currentUser)
        {
            WorkLogDomainValidation.Required(title, nameof(Title));
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));

            Title = title.Trim();
            Description = description;
            Priority = priority;
            AssigneeId = assigneeId;
            IsPriority = isPriority;
            AuditInfo.Update(currentUser);
        }
    }
}
