using System;
using System.Collections.Generic;
using System.Linq;
using SC.WorkLog.Domain.AggregateRoots;
using SC.WorkLog.Domain.DomainServices.Results;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Domain.DomainServices
{
    public static class OvertimeCalculator
    {
        public static OvertimeCalculationResult Calculate(Employee employee, DateTime date, IEnumerable<TimeEntry> existingTimeEntries, IEnumerable<LeaveRequest> approvedLeaveRequests, OvertimeRequest existingOvertimeRequest)
        {
            if (employee == null)
                throw new ArgumentException("Employee is required.");

            var day = date.Date;
            var workItemHours = (existingTimeEntries ?? Enumerable.Empty<TimeEntry>())
                .Where(x => x.EmployeeId == employee.Id && x.Date.Date == day)
                .Sum(x => x.Time);
            var leaveHours = (approvedLeaveRequests ?? Enumerable.Empty<LeaveRequest>())
                .Where(x => x.EmployeeId == employee.Id && x.Date.Date == day && x.Status == RequestStatus.Approved)
                .Sum(x => x.Hours);
            var dailyTotal = workItemHours + leaveHours;

            if (dailyTotal <= employee.ExpectedDailyHours)
                return new OvertimeCalculationResult(employee.Id, day, false, 0, OvertimeCalculationAction.None);

            var calculatedOvertimeHours = dailyTotal - employee.ExpectedDailyHours;

            if (existingOvertimeRequest == null)
                return new OvertimeCalculationResult(employee.Id, day, true, calculatedOvertimeHours, OvertimeCalculationAction.Create);

            if (existingOvertimeRequest.Status == RequestStatus.PendingApproval)
                return new OvertimeCalculationResult(employee.Id, day, true, calculatedOvertimeHours, OvertimeCalculationAction.UpdatePending);

            return new OvertimeCalculationResult(employee.Id, day, true, calculatedOvertimeHours, OvertimeCalculationAction.None);
        }
    }
}
