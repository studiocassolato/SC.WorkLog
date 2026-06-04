using System;
using SC.WorkLog.Domain.DomainServices;
using SC.WorkLog.Domain.ValueObjects;

namespace SC.WorkLog.Domain.AggregateRoots
{
    public class ProjectMilestone : AggregateRoot
    {
        public Guid ProjectId { get; private set; }
        public string Title { get; private set; }
        public DateTime Date { get; private set; }

        private ProjectMilestone()
        {
        }

        public ProjectMilestone(Guid projectId, string title, DateTime date, string currentUser)
        {
            WorkLogDomainValidation.Required(projectId, nameof(ProjectId));
            WorkLogDomainValidation.Required(title, nameof(Title));
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));

            ProjectId = projectId;
            Title = title.Trim();
            Date = date.Date;
            AuditInfo = new AuditInfo(currentUser);
        }

        public void Update(string title, DateTime date, string currentUser)
        {
            WorkLogDomainValidation.Required(title, nameof(Title));
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));

            Title = title.Trim();
            Date = date.Date;
            AuditInfo.Update(currentUser);
        }
    }
}
