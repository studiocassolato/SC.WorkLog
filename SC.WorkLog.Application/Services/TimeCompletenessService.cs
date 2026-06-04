using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SC.WorkLog.Application.DTO.Common;
using SC.WorkLog.Application.DTO.Reports;
using SC.WorkLog.Application.Validation;
using SC.WorkLog.Domain.AggregateRoots;
using SC.WorkLog.Domain.DomainServices;
using SC.WorkLog.Domain.Enums;
using SC.WorkLog.Domain.Interfaces;

namespace SC.WorkLog.Application.Services
{
    public class TimeCompletenessService
    {
        private readonly IRepository<Employee> _employees;
        private readonly IRepository<TimeEntry> _timeEntries;
        private readonly IRepository<LeaveRequest> _leaveRequests;
        private readonly IRepository<OvertimeRequest> _overtimeRequests;

        public TimeCompletenessService(IRepository<Employee> employees, IRepository<TimeEntry> timeEntries, IRepository<LeaveRequest> leaveRequests, IRepository<OvertimeRequest> overtimeRequests)
        {
            _employees = employees;
            _timeEntries = timeEntries;
            _leaveRequests = leaveRequests;
            _overtimeRequests = overtimeRequests;
        }

        public async Task<TimeCompletenessDto> GetTimeCompletenessAsync(TimeCompletenessFilter filter, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.ValidDateRange(filter.DateFrom, filter.DateTo, nameof(filter.DateTo));
            var employees = await _employees.Get(x => x.Active);
            if (filter.EmployeeId.HasValue)
                employees = employees.Where(x => x.Id == filter.EmployeeId.Value).ToList();
            if (!userContext.IsAdmin())
                employees = employees.Where(x => x.Id == userContext.EmployeeId).ToList();

            var timeEntries = await _timeEntries.Get(x => x.Date >= filter.DateFrom.Date && x.Date <= filter.DateTo.Date);
            var leaveRequests = await _leaveRequests.Get(x => x.Date >= filter.DateFrom.Date && x.Date <= filter.DateTo.Date && x.Status == RequestStatus.Approved);
            var overtimeRequests = await _overtimeRequests.Get(x => x.Date >= filter.DateFrom.Date && x.Date <= filter.DateTo.Date);
            var result = CalculateRange(employees, filter.DateFrom, filter.DateTo, timeEntries, leaveRequests, overtimeRequests);
            if (filter.Status.HasValue)
                result.Rows = result.Rows.Where(x => x.Status == filter.Status.Value).ToList();
            return result;
        }

        public DailyTimeCompletenessRowDto CalculateDailyCompleteness(Employee employee, DateTime date, IEnumerable<TimeEntry> timeEntries, IEnumerable<LeaveRequest> leaveRequests, IEnumerable<OvertimeRequest> overtimeRequests)
        {
            var result = DailyTimeCompletenessCalculator.Calculate(employee, date, timeEntries, leaveRequests, overtimeRequests);
            return new DailyTimeCompletenessRowDto
            {
                EmployeeId = result.EmployeeId,
                EmployeeName = string.Concat(employee.FirstName, " ", employee.LastName),
                Date = result.Date,
                WorkItemHours = result.WorkItemHours,
                LeaveHours = result.LeaveHours,
                DailyTotal = result.DailyTotal,
                ExpectedDailyHours = result.ExpectedDailyHours,
                MissingHours = result.MissingHours,
                OvertimeHours = result.OvertimeHours,
                Status = result.Status
            };
        }

        public TimeCompletenessDto CalculateRange(IEnumerable<Employee> employees, DateTime dateFrom, DateTime dateTo, IEnumerable<TimeEntry> timeEntries, IEnumerable<LeaveRequest> leaveRequests, IEnumerable<OvertimeRequest> overtimeRequests)
        {
            WorkLogApplicationValidation.ValidDateRange(dateFrom, dateTo, nameof(dateTo));
            var rows = new List<DailyTimeCompletenessRowDto>();
            var current = dateFrom.Date;

            while (current <= dateTo.Date)
            {
                foreach (var employee in employees ?? Enumerable.Empty<Employee>())
                    rows.Add(CalculateDailyCompleteness(employee, current, timeEntries, leaveRequests, overtimeRequests));
                current = current.AddDays(1);
            }

            return new TimeCompletenessDto
            {
                DateFrom = dateFrom.Date,
                DateTo = dateTo.Date,
                Rows = rows
            };
        }
    }
}
