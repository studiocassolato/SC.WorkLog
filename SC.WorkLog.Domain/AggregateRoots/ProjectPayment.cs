using System;
using SC.WorkLog.Domain.DomainServices;
using SC.WorkLog.Domain.ValueObjects;

namespace SC.WorkLog.Domain.AggregateRoots
{
    public class ProjectPayment : AggregateRoot
    {
        public Guid ProjectId { get; private set; }
        public DateTime PaymentDate { get; private set; }
        public decimal Amount { get; private set; }
        public string Note { get; private set; }

        private ProjectPayment()
        {
        }

        public ProjectPayment(Guid projectId, DateTime paymentDate, decimal amount, string note, string currentUser)
        {
            WorkLogDomainValidation.Required(projectId, nameof(ProjectId));
            WorkLogDomainValidation.Positive(amount, nameof(Amount));
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));

            ProjectId = projectId;
            PaymentDate = paymentDate.Date;
            Amount = amount;
            Note = note;
            AuditInfo = new AuditInfo(currentUser);
        }

        public void EnsureCompatibleWith(Project project)
        {
            if (project == null)
                throw new ArgumentException("Project is required.");

            if (project.Id != ProjectId)
                throw new ArgumentException("ProjectPayment must belong to the specified project.");

            project.EnsureCanHavePayments();
        }

        public void Update(DateTime paymentDate, decimal amount, string note, string currentUser)
        {
            WorkLogDomainValidation.Positive(amount, nameof(Amount));
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));

            PaymentDate = paymentDate.Date;
            Amount = amount;
            Note = note;
            AuditInfo.Update(currentUser);
        }
    }
}
