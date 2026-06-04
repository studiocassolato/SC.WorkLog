using System;
using SC.WorkLog.Domain.DomainServices;
using SC.WorkLog.Domain.Enums;
using SC.WorkLog.Domain.ValueObjects;

namespace SC.WorkLog.Domain.AggregateRoots
{
    public class TimeEntry : AggregateRoot
    {
        public Guid EmployeeId { get; private set; }
        public Guid WorkItemId { get; private set; }
        public DateTime Date { get; private set; }
        public decimal Time { get; private set; }
        public decimal ApprovedTime { get; private set; }
        public string Description { get; private set; }
        public string Notes { get; private set; }
        public RequestStatus Status { get; private set; }
        public string AdminNote { get; private set; }
        public EmployeeLevel EmployeeLevelSnapshot { get; private set; }
        public decimal EmployeeDefaultRateSnapshot { get; private set; }
        public decimal ProjectRateSnapshot { get; private set; }

        private TimeEntry()
        {
        }

        public TimeEntry(Guid employeeId, Guid workItemId, DateTime date, decimal time, decimal approvedTime, string description, string notes, RequestStatus status, string adminNote, EmployeeLevel employeeLevelSnapshot, decimal employeeDefaultRateSnapshot, decimal projectRateSnapshot, string currentUser)
        {
            WorkLogDomainValidation.Required(employeeId, nameof(EmployeeId));
            WorkLogDomainValidation.Required(workItemId, nameof(WorkItemId));
            WorkLogDomainValidation.HalfHourIncrement(time, nameof(Time));
            WorkLogDomainValidation.HalfHourIncrement(approvedTime, nameof(ApprovedTime));
            WorkLogDomainValidation.NonNegative(employeeDefaultRateSnapshot, nameof(EmployeeDefaultRateSnapshot));
            WorkLogDomainValidation.NonNegative(projectRateSnapshot, nameof(ProjectRateSnapshot));
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));

            EmployeeId = employeeId;
            WorkItemId = workItemId;
            Date = date.Date;
            Time = time;
            ApprovedTime = approvedTime;
            Description = description;
            Notes = notes;
            Status = status;
            AdminNote = adminNote;
            EmployeeLevelSnapshot = employeeLevelSnapshot;
            EmployeeDefaultRateSnapshot = employeeDefaultRateSnapshot;
            ProjectRateSnapshot = projectRateSnapshot;
            AuditInfo = new AuditInfo(currentUser);
        }

        public void UpdateLoggedTime(DateTime date, decimal time, string description, string notes, string currentUser)
        {
            WorkLogDomainValidation.HalfHourIncrement(time, nameof(Time));
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));

            Date = date.Date;
            Time = time;
            Description = description;
            Notes = notes;
            AuditInfo.Update(currentUser);
        }

        public void Approve(decimal approvedTime, string adminNote, string currentUser)
        {
            WorkLogDomainValidation.HalfHourIncrement(approvedTime, nameof(ApprovedTime));
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));

            ApprovedTime = approvedTime;
            AdminNote = adminNote;
            Status = RequestStatus.Approved;
            AuditInfo.Update(currentUser);
        }
    }
}
