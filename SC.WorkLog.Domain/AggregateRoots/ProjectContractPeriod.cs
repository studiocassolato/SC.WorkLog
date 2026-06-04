using System;
using SC.WorkLog.Domain.DomainServices;
using SC.WorkLog.Domain.ValueObjects;

namespace SC.WorkLog.Domain.AggregateRoots
{
    public class ProjectContractPeriod : AggregateRoot
    {
        public Guid ProjectId { get; private set; }
        public DateTime StartDate { get; private set; }
        public DateTime EndDate { get; private set; }
        public decimal Amount { get; private set; }
        public DateTime? PaymentDate { get; private set; }
        public string Note { get; private set; }

        private ProjectContractPeriod()
        {
        }

        public ProjectContractPeriod(Guid projectId, DateTime startDate, DateTime endDate, decimal amount, DateTime? paymentDate, string note, string currentUser)
        {
            WorkLogDomainValidation.Required(projectId, nameof(ProjectId));
            WorkLogDomainValidation.ValidDateRange(startDate, endDate, nameof(EndDate));
            WorkLogDomainValidation.Positive(amount, nameof(Amount));
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));

            ProjectId = projectId;
            StartDate = startDate.Date;
            EndDate = endDate.Date;
            Amount = amount;
            PaymentDate = paymentDate?.Date;
            Note = note;
            AuditInfo = new AuditInfo(currentUser);
        }

        public void EnsureCompatibleWith(Project project)
        {
            if (project == null)
                throw new ArgumentException("Project is required.");

            if (project.Id != ProjectId)
                throw new ArgumentException("ProjectContractPeriod must belong to the specified project.");

            project.EnsureCanHaveContractPeriods();
        }

        public bool Includes(DateTime date)
        {
            var value = date.Date;
            return value >= StartDate && value <= EndDate;
        }

        public void Update(DateTime startDate, DateTime endDate, decimal amount, DateTime? paymentDate, string note, string currentUser)
        {
            WorkLogDomainValidation.ValidDateRange(startDate, endDate, nameof(EndDate));
            WorkLogDomainValidation.Positive(amount, nameof(Amount));
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));

            StartDate = startDate.Date;
            EndDate = endDate.Date;
            Amount = amount;
            PaymentDate = paymentDate?.Date;
            Note = note;
            AuditInfo.Update(currentUser);
        }
    }
}
