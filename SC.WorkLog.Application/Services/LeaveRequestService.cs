using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SC.WorkLog.Application.DTO.Common;
using SC.WorkLog.Application.DTO.LeaveRequests;
using SC.WorkLog.Application.Validation;
using SC.WorkLog.Domain.AggregateRoots;
using SC.WorkLog.Domain.Enums;
using SC.WorkLog.Domain.Interfaces;

namespace SC.WorkLog.Application.Services
{
    public class LeaveRequestService
    {
        private readonly IRepository<LeaveRequest> _leaveRequests;
        private readonly IRepository<Employee> _employees;

        public LeaveRequestService(IRepository<LeaveRequest> leaveRequests, IRepository<Employee> employees)
        {
            _leaveRequests = leaveRequests;
            _employees = employees;
        }

        public async Task<List<LeaveRequestDto>> GetLeaveRequestsAsync(LeaveRequestFilter filter, WorkLogUserContext userContext)
        {
            filter = filter ?? new LeaveRequestFilter();
            var effectiveEmployeeId = userContext != null && !userContext.IsAdmin() ? userContext.EmployeeId : filter.EmployeeId;
            var requests = await _leaveRequests.Get(x => (!effectiveEmployeeId.HasValue || x.EmployeeId == effectiveEmployeeId.Value)
                && (!filter.Type.HasValue || x.Type == filter.Type.Value)
                && (!filter.DateFrom.HasValue || x.Date >= filter.DateFrom.Value.Date)
                && (!filter.DateTo.HasValue || x.Date <= filter.DateTo.Value.Date)
                && (!filter.Status.HasValue || x.Status == filter.Status.Value), sortOrder: x => x.Date, sortDescending: true);

            return await BuildLeaveRequestListAsync(requests);
        }

        public async Task<LeaveRequestDto> CreateLeaveRequestAsync(CreateLeaveRequestRequest request, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.Required(request.EmployeeId, nameof(request.EmployeeId));
            WorkLogApplicationValidation.Required(request.Date, nameof(request.Date));
            EnsureValidLeaveType(request.Type);
            WorkLogApplicationValidation.HalfHourIncrement(request.Hours, nameof(request.Hours));
            WorkLogApplicationValidation.RequireEmployeeSelfOrAdmin(request.EmployeeId, userContext, nameof(CreateLeaveRequestAsync));
            await GetActiveEmployeeOrThrow(request.EmployeeId);
            var leaveRequest = new LeaveRequest(request.EmployeeId, request.Type, request.Date, request.Hours, request.EmployeeNote, CurrentUser(userContext));
            await _leaveRequests.InsertAsync(leaveRequest);
            return await BuildLeaveRequestDtoAsync(leaveRequest);
        }

        public async Task<LeaveRequestDto> ApproveLeaveRequestAsync(ApproveLeaveRequestRequest request, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(ApproveLeaveRequestAsync));
            WorkLogApplicationValidation.Required(request.Id, nameof(request.Id));
            var leaveRequest = await GetLeaveRequestOrThrow(request.Id);
            leaveRequest.Approve(request.AdminNote, CurrentUser(userContext));
            await _leaveRequests.InsertOrReplace(leaveRequest);
            return await BuildLeaveRequestDtoAsync(leaveRequest);
        }

        public async Task<LeaveRequestDto> RejectLeaveRequestAsync(RejectLeaveRequestRequest request, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(RejectLeaveRequestAsync));
            WorkLogApplicationValidation.Required(request.Id, nameof(request.Id));
            var leaveRequest = await GetLeaveRequestOrThrow(request.Id);
            leaveRequest.Reject(request.AdminNote, CurrentUser(userContext));
            await _leaveRequests.InsertOrReplace(leaveRequest);
            return await BuildLeaveRequestDtoAsync(leaveRequest);
        }

        private async Task<LeaveRequest> GetLeaveRequestOrThrow(Guid leaveRequestId)
        {
            var leaveRequest = await _leaveRequests.GetSingleOrDefaultAsync(x => x.Id == leaveRequestId);
            if (leaveRequest == null)
                throw new ArgumentException("Leave request not found.");
            return leaveRequest;
        }

        private async Task<Employee> GetEmployeeOrThrow(Guid employeeId)
        {
            var employee = await _employees.GetSingleOrDefaultAsync(x => x.Id == employeeId);
            if (employee == null)
                throw new ArgumentException("Employee not found.");
            return employee;
        }

        private async Task<Employee> GetActiveEmployeeOrThrow(Guid employeeId)
        {
            var employee = await GetEmployeeOrThrow(employeeId);
            if (!employee.Active)
                throw new ArgumentException("Active employee not found.");
            return employee;
        }

        private static void EnsureValidLeaveType(LeaveRequestType type)
        {
            if (!Enum.IsDefined(typeof(LeaveRequestType), type))
                throw new ArgumentException("Leave request type is invalid.");
        }

        private async Task<List<LeaveRequestDto>> BuildLeaveRequestListAsync(List<LeaveRequest> requests)
        {
            var employeeIds = requests.Select(x => x.EmployeeId).Distinct().ToList();
            var employees = employeeIds.Any() ? await _employees.Get(x => employeeIds.Contains(x.Id)) : new List<Employee>();
            var employeesById = employees.ToDictionary(x => x.Id);
            return requests.Select(x => MapLeaveRequest(x, employeesById)).ToList();
        }

        private async Task<LeaveRequestDto> BuildLeaveRequestDtoAsync(LeaveRequest request)
        {
            var employee = await _employees.GetSingleOrDefaultAsync(x => x.Id == request.EmployeeId);
            var employeesById = employee == null ? new Dictionary<Guid, Employee>() : new Dictionary<Guid, Employee> { { employee.Id, employee } };
            return MapLeaveRequest(request, employeesById);
        }

        private static LeaveRequestDto MapLeaveRequest(LeaveRequest request, Dictionary<Guid, Employee> employeesById)
        {
            employeesById.TryGetValue(request.EmployeeId, out var employee);
            return new LeaveRequestDto
            {
                Id = request.Id,
                EmployeeId = request.EmployeeId,
                EmployeeName = employee == null ? null : string.Concat(employee.FirstName, " ", employee.LastName),
                Type = request.Type,
                Date = request.Date,
                Hours = request.Hours,
                Status = request.Status,
                RequestDate = request.RequestDate,
                EmployeeNote = request.EmployeeNote,
                AdminNote = request.AdminNote
            };
        }

        private static string CurrentUser(WorkLogUserContext userContext)
        {
            return string.IsNullOrWhiteSpace(userContext?.Email) ? "system" : userContext.Email;
        }
    }
}
