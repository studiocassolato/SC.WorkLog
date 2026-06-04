using System;
using SC.WorkLog.Domain.DomainServices;
using SC.WorkLog.Domain.Enums;
using SC.WorkLog.Domain.ValueObjects;

namespace SC.WorkLog.Domain.AggregateRoots
{
    public class LeaveRequest : AggregateRoot
    {
        public Guid EmployeeId { get; private set; }
        public LeaveRequestType Type { get; private set; }
        public DateTime Date { get; private set; }
        public decimal Hours { get; private set; }
        public RequestStatus Status { get; private set; }
        public DateTime RequestDate { get; private set; }
        public string EmployeeNote { get; private set; }
        public string AdminNote { get; private set; }

        private LeaveRequest()
        {
        }

        public LeaveRequest(Guid employeeId, LeaveRequestType type, DateTime date, decimal hours, string employeeNote, string currentUser)
        {
            WorkLogDomainValidation.Required(employeeId, nameof(EmployeeId));
            WorkLogDomainValidation.HalfHourIncrement(hours, nameof(Hours));
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));

            EmployeeId = employeeId;
            Type = type;
            Date = date.Date;
            Hours = hours;
            Status = RequestStatus.PendingApproval;
            RequestDate = DateTime.UtcNow;
            EmployeeNote = employeeNote;
            AuditInfo = new AuditInfo(currentUser);
        }

        public void Approve(string adminNote, string currentUser)
        {
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));

            Status = RequestStatus.Approved;
            AdminNote = adminNote;
            AuditInfo.Update(currentUser);
        }

        public void Reject(string adminNote, string currentUser)
        {
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));

            Status = RequestStatus.Rejected;
            AdminNote = adminNote;
            AuditInfo.Update(currentUser);
        }
    }
}
