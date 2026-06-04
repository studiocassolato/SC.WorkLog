using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SC.WorkLog.Application.DTO.Common;
using SC.WorkLog.Application.DTO.OvertimeRequests;
using SC.WorkLog.Application.DTO.TimeEntries;
using SC.WorkLog.Application.Validation;
using SC.WorkLog.Domain.AggregateRoots;
using SC.WorkLog.Domain.Interfaces;

namespace SC.WorkLog.Application.Services
{
    public class OvertimeRequestService
    {
        private readonly IRepository<OvertimeRequest> _overtimeRequests;
        private readonly IRepository<Employee> _employees;
        private readonly TimeEntryService _timeEntryService;

        public OvertimeRequestService(IRepository<OvertimeRequest> overtimeRequests, IRepository<Employee> employees, IRepository<TimeEntry> timeEntries, TimeEntryService timeEntryService)
        {
            _overtimeRequests = overtimeRequests;
            _employees = employees;
            _timeEntryService = timeEntryService;
        }

        public async Task<List<OvertimeRequestDto>> GetOvertimeRequestsAsync(OvertimeRequestFilter filter, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(GetOvertimeRequestsAsync));
            filter = filter ?? new OvertimeRequestFilter();
            var requests = await _overtimeRequests.Get(x => (!filter.EmployeeId.HasValue || x.EmployeeId == filter.EmployeeId.Value)
                && (!filter.DateFrom.HasValue || x.Date >= filter.DateFrom.Value.Date)
                && (!filter.DateTo.HasValue || x.Date <= filter.DateTo.Value.Date)
                && (!filter.Status.HasValue || x.Status == filter.Status.Value), sortOrder: x => x.Date, sortDescending: true);

            var employeeIds = requests.Select(x => x.EmployeeId).Distinct().ToList();
            var employees = employeeIds.Any() ? await _employees.Get(x => employeeIds.Contains(x.Id)) : new List<Employee>();
            var employeesById = employees.ToDictionary(x => x.Id);
            return requests.Select(x => MapOvertimeRequest(x, employeesById, new List<TimeEntryListItemDto>())).ToList();
        }

        public async Task<OvertimeRequestDto> GetOvertimeRequestDetailAsync(Guid overtimeRequestId, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(GetOvertimeRequestDetailAsync));
            WorkLogApplicationValidation.Required(overtimeRequestId, nameof(overtimeRequestId));
            return await BuildOvertimeRequestDetailAsync(await GetOvertimeRequestOrThrow(overtimeRequestId), userContext);
        }

        public async Task<OvertimeRequestDto> ApproveOvertimeRequestAsync(ApproveOvertimeRequestRequest request, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(ApproveOvertimeRequestAsync));
            WorkLogApplicationValidation.Required(request.Id, nameof(request.Id));
            WorkLogApplicationValidation.HalfHourIncrement(request.ApprovedHours, nameof(request.ApprovedHours));
            var overtimeRequest = await GetOvertimeRequestOrThrow(request.Id);
            overtimeRequest.Approve(request.ApprovedHours, request.AdminNote, CurrentUser(userContext));
            await _overtimeRequests.InsertOrReplace(overtimeRequest);
            return await BuildOvertimeRequestDetailAsync(overtimeRequest, userContext);
        }

        public async Task<OvertimeRequestDto> RejectOvertimeRequestAsync(RejectOvertimeRequestRequest request, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(RejectOvertimeRequestAsync));
            WorkLogApplicationValidation.Required(request.Id, nameof(request.Id));
            var overtimeRequest = await GetOvertimeRequestOrThrow(request.Id);
            overtimeRequest.Reject(request.AdminNote, CurrentUser(userContext));
            await _overtimeRequests.InsertOrReplace(overtimeRequest);
            return await BuildOvertimeRequestDetailAsync(overtimeRequest, userContext);
        }

        private async Task<OvertimeRequest> GetOvertimeRequestOrThrow(Guid overtimeRequestId)
        {
            var overtimeRequest = await _overtimeRequests.GetSingleOrDefaultAsync(x => x.Id == overtimeRequestId);
            if (overtimeRequest == null)
                throw new ArgumentException("Overtime request not found.");
            return overtimeRequest;
        }

        private async Task<OvertimeRequestDto> BuildOvertimeRequestDetailAsync(OvertimeRequest request, WorkLogUserContext userContext)
        {
            var employee = await _employees.GetSingleOrDefaultAsync(x => x.Id == request.EmployeeId);
            var employeesById = employee == null ? new Dictionary<Guid, Employee>() : new Dictionary<Guid, Employee> { { employee.Id, employee } };
            var dayEntries = await _timeEntryService.GetTimeEntriesAsync(new TimeEntryFilter { EmployeeId = request.EmployeeId, DateFrom = request.Date, DateTo = request.Date }, userContext);
            return MapOvertimeRequest(request, employeesById, dayEntries);
        }

        private static OvertimeRequestDto MapOvertimeRequest(OvertimeRequest request, Dictionary<Guid, Employee> employeesById, List<TimeEntryListItemDto> dayTimeEntries)
        {
            employeesById.TryGetValue(request.EmployeeId, out var employee);
            return new OvertimeRequestDto
            {
                Id = request.Id,
                EmployeeId = request.EmployeeId,
                EmployeeName = employee == null ? null : string.Concat(employee.FirstName, " ", employee.LastName),
                Date = request.Date,
                CalculatedHours = request.CalculatedHours,
                ApprovedHours = request.ApprovedHours,
                Status = request.Status,
                AdminNote = request.AdminNote,
                DayTimeEntries = dayTimeEntries
            };
        }

        private static string CurrentUser(WorkLogUserContext userContext)
        {
            return string.IsNullOrWhiteSpace(userContext?.Email) ? "system" : userContext.Email;
        }
    }
}
