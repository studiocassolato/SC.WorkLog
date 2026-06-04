using System;
using SC.WorkLog.Domain.DomainServices;
using SC.WorkLog.Domain.Enums;
using SC.WorkLog.Domain.ValueObjects;

namespace SC.WorkLog.Domain.AggregateRoots
{
    public class OvertimeRequest : AggregateRoot
    {
        public Guid EmployeeId { get; private set; }
        public DateTime Date { get; private set; }
        public decimal CalculatedHours { get; private set; }
        public decimal ApprovedHours { get; private set; }
        public RequestStatus Status { get; private set; }
        public string AdminNote { get; private set; }

        private OvertimeRequest()
        {
        }

        public OvertimeRequest(Guid employeeId, DateTime date, decimal calculatedHours, string currentUser)
        {
            WorkLogDomainValidation.Required(employeeId, nameof(EmployeeId));
            WorkLogDomainValidation.HalfHourIncrement(calculatedHours, nameof(CalculatedHours));
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));

            EmployeeId = employeeId;
            Date = date.Date;
            CalculatedHours = calculatedHours;
            ApprovedHours = 0;
            Status = RequestStatus.PendingApproval;
            AuditInfo = new AuditInfo(currentUser);
        }

        public void UpdateCalculatedHours(decimal calculatedHours, string currentUser)
        {
            WorkLogDomainValidation.HalfHourIncrement(calculatedHours, nameof(CalculatedHours));
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));

            CalculatedHours = calculatedHours;
            AuditInfo.Update(currentUser);
        }

        public void Approve(decimal approvedHours, string adminNote, string currentUser)
        {
            WorkLogDomainValidation.HalfHourIncrement(approvedHours, nameof(ApprovedHours));
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));

            ApprovedHours = approvedHours;
            Status = RequestStatus.Approved;
            AdminNote = adminNote;
            AuditInfo.Update(currentUser);
        }

        public void Reject(string adminNote, string currentUser)
        {
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));

            ApprovedHours = 0;
            Status = RequestStatus.Rejected;
            AdminNote = adminNote;
            AuditInfo.Update(currentUser);
        }
    }
}
