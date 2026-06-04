using System;
using System.Collections.Generic;
using System.Linq;
using SC.WorkLog.Domain.AggregateRoots;
using SC.WorkLog.Domain.DomainServices.Results;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Domain.DomainServices
{
    public static class DailyTimeCompletenessCalculator
    {
        public static DailyTimeCompletenessResult Calculate(Employee employee, DateTime date, IEnumerable<TimeEntry> timeEntries, IEnumerable<LeaveRequest> leaveRequests, IEnumerable<OvertimeRequest> overtimeRequests)
        {
            if (employee == null)
                throw new ArgumentException("Employee is required.");

            var day = date.Date;
            var workItemHours = (timeEntries ?? Enumerable.Empty<TimeEntry>())
                .Where(x => x.EmployeeId == employee.Id && x.Date.Date == day)
                .Sum(x => x.Time);

            var leaveHours = (leaveRequests ?? Enumerable.Empty<LeaveRequest>())
                .Where(x => x.EmployeeId == employee.Id && x.Date.Date == day && x.Status == RequestStatus.Approved)
                .Sum(x => x.Hours);

            var dailyTotal = workItemHours + leaveHours;
            var missingHours = dailyTotal < employee.ExpectedDailyHours ? employee.ExpectedDailyHours - dailyTotal : 0;
            var overtimeHours = dailyTotal > employee.ExpectedDailyHours ? dailyTotal - employee.ExpectedDailyHours : 0;
            var hasApprovedOvertime = (overtimeRequests ?? Enumerable.Empty<OvertimeRequest>())
                .Any(x => x.EmployeeId == employee.Id && x.Date.Date == day && x.Status == RequestStatus.Approved && x.ApprovedHours > 0);

            return new DailyTimeCompletenessResult(
                employee.Id,
                day,
                workItemHours,
                leaveHours,
                dailyTotal,
                employee.ExpectedDailyHours,
                missingHours,
                overtimeHours,
                GetStatus(dailyTotal, employee.ExpectedDailyHours, hasApprovedOvertime));
        }

        private static DailyTimeCompletenessStatus GetStatus(decimal dailyTotal, decimal expectedDailyHours, bool hasApprovedOvertime)
        {
            if (dailyTotal < expectedDailyHours)
                return DailyTimeCompletenessStatus.MissingHours;

            if (dailyTotal > expectedDailyHours)
                return hasApprovedOvertime ? DailyTimeCompletenessStatus.OvertimeApproved : DailyTimeCompletenessStatus.OvertimePending;

            return DailyTimeCompletenessStatus.OK;
        }
    }
}
