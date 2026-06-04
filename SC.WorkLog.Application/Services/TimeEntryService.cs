using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SC.WorkLog.Application.DTO.Common;
using SC.WorkLog.Application.DTO.TimeEntries;
using SC.WorkLog.Application.Validation;
using SC.WorkLog.Domain.AggregateRoots;
using SC.WorkLog.Domain.DomainServices;
using SC.WorkLog.Domain.Enums;
using SC.WorkLog.Domain.Interfaces;

namespace SC.WorkLog.Application.Services
{
    public class TimeEntryService
    {
        private readonly IRepository<TimeEntry> _timeEntries;
        private readonly IRepository<Employee> _employees;
        private readonly IRepository<WorkItem> _workItems;
        private readonly IRepository<Project> _projects;
        private readonly IRepository<Customer> _customers;
        private readonly IRepository<LeaveRequest> _leaveRequests;
        private readonly IRepository<OvertimeRequest> _overtimeRequests;

        public TimeEntryService(IRepository<TimeEntry> timeEntries, IRepository<Employee> employees, IRepository<WorkItem> workItems, IRepository<Project> projects, IRepository<Customer> customers, IRepository<LeaveRequest> leaveRequests, IRepository<OvertimeRequest> overtimeRequests)
        {
            _timeEntries = timeEntries;
            _employees = employees;
            _workItems = workItems;
            _projects = projects;
            _customers = customers;
            _leaveRequests = leaveRequests;
            _overtimeRequests = overtimeRequests;
        }

        public async Task<TimeEntryDetailDto> CreateTimeEntryAsync(CreateTimeEntryRequest request, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.Required(request.EmployeeId, nameof(request.EmployeeId));
            WorkLogApplicationValidation.Required(request.WorkItemId, nameof(request.WorkItemId));
            WorkLogApplicationValidation.Required(request.Date, nameof(request.Date));
            WorkLogApplicationValidation.HalfHourIncrement(request.Time, nameof(request.Time));
            WorkLogApplicationValidation.RequireEmployeeSelfOrAdmin(request.EmployeeId, userContext, nameof(CreateTimeEntryAsync));

            var employee = await GetActiveEmployeeOrThrow(request.EmployeeId);
            var workItem = await GetWorkItemOrThrow(request.WorkItemId);
            var project = await GetProjectOrThrow(workItem.ProjectId);
            var projectRateSnapshot = GetProjectRateSnapshot(project, employee.Level);
            var timeEntry = new TimeEntry(employee.Id, workItem.Id, workItem.ProjectId, request.Date, request.Time, request.Time, request.Description, request.Notes, RequestStatus.PendingApproval, null, employee.Level, employee.DefaultHourlyRate, projectRateSnapshot, CurrentUser(userContext));
            await _timeEntries.InsertAsync(timeEntry);
            await EvaluateOvertime(employee, timeEntry.Date, timeEntry, userContext);
            return await BuildTimeEntryDetailAsync(timeEntry, userContext);
        }

        public async Task<TimeEntryDetailDto> UpdateTimeEntryAsync(UpdateTimeEntryRequest request, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.Required(request.Id, nameof(request.Id));
            WorkLogApplicationValidation.Required(request.Date, nameof(request.Date));
            WorkLogApplicationValidation.HalfHourIncrement(request.Time, nameof(request.Time));
            var timeEntry = await GetTimeEntryOrThrow(request.Id);
            WorkLogApplicationValidation.RequireEmployeeSelfOrAdmin(timeEntry.EmployeeId, userContext, nameof(UpdateTimeEntryAsync));
            EnsureCanModify(timeEntry, userContext);
            var requestedWorkItemId = request.WorkItemId == Guid.Empty ? timeEntry.WorkItemId : request.WorkItemId;
            var workItem = await GetWorkItemOrThrow(requestedWorkItemId);
            var employee = await GetEmployeeOrThrow(timeEntry.EmployeeId);
            var project = await GetProjectOrThrow(workItem.ProjectId);
            var projectRateSnapshot = GetProjectRateSnapshot(project, timeEntry.EmployeeLevelSnapshot);
            if (timeEntry.WorkItemId != workItem.Id || timeEntry.ProjectId != workItem.ProjectId || timeEntry.ProjectRateSnapshot != projectRateSnapshot)
                timeEntry.ChangeWorkItem(workItem.Id, workItem.ProjectId, projectRateSnapshot, CurrentUser(userContext));

            timeEntry.UpdateLoggedTime(request.Date, request.Time, request.Description, request.Notes, CurrentUser(userContext));
            await _timeEntries.InsertOrReplace(timeEntry);
            await EvaluateOvertime(employee, timeEntry.Date, null, userContext);
            return await BuildTimeEntryDetailAsync(timeEntry, userContext);
        }

        public async Task<TimeEntryDetailDto> UpdateApprovedTimeAsync(UpdateApprovedTimeRequest request, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(UpdateApprovedTimeAsync));
            WorkLogApplicationValidation.Required(request.Id, nameof(request.Id));
            WorkLogApplicationValidation.NonNegativeHalfHourIncrement(request.ApprovedTime, nameof(request.ApprovedTime));
            var timeEntry = await GetTimeEntryOrThrow(request.Id);
            timeEntry.Approve(request.ApprovedTime, request.AdminNote, CurrentUser(userContext));
            await _timeEntries.InsertOrReplace(timeEntry);
            return await BuildTimeEntryDetailAsync(timeEntry, userContext);
        }

        public async Task<List<TimeEntryListItemDto>> GetTimeEntriesAsync(TimeEntryFilter filter, WorkLogUserContext userContext)
        {
            filter = filter ?? new TimeEntryFilter();
            var effectiveEmployeeId = userContext != null && !userContext.IsAdmin() ? userContext.EmployeeId : filter.EmployeeId;
            var projectIdsForCustomer = new List<Guid>();
            if (filter.CustomerId.HasValue)
            {
                var customerProjects = await _projects.Get(x => x.CustomerId == filter.CustomerId.Value);
                projectIdsForCustomer = customerProjects.Select(x => x.Id).ToList();
                if (!projectIdsForCustomer.Any())
                    return new List<TimeEntryListItemDto>();
            }

            var timeEntries = await _timeEntries.Get(x => (!effectiveEmployeeId.HasValue || x.EmployeeId == effectiveEmployeeId.Value)
                && (!filter.CustomerId.HasValue || projectIdsForCustomer.Contains(x.ProjectId))
                && (!filter.WorkItemId.HasValue || x.WorkItemId == filter.WorkItemId.Value)
                && (!filter.ProjectId.HasValue || x.ProjectId == filter.ProjectId.Value)
                && (!filter.Status.HasValue || x.Status == filter.Status.Value)
                && (!filter.DateFrom.HasValue || x.Date >= filter.DateFrom.Value.Date)
                && (!filter.DateTo.HasValue || x.Date <= filter.DateTo.Value.Date), sortOrder: x => x.Date, sortDescending: true);

            return await BuildTimeEntryListAsync(timeEntries, userContext);
        }

        private async Task EvaluateOvertime(Employee employee, DateTime date, TimeEntry newlyCreatedTimeEntry, WorkLogUserContext userContext)
        {
            var dayEntries = await _timeEntries.Get(x => x.EmployeeId == employee.Id && x.Date == date.Date);
            if (newlyCreatedTimeEntry != null && dayEntries.All(x => x.Id != newlyCreatedTimeEntry.Id))
                dayEntries.Add(newlyCreatedTimeEntry);
            var approvedLeaves = await _leaveRequests.Get(x => x.EmployeeId == employee.Id && x.Date == date.Date && x.Status == RequestStatus.Approved);
            var existingOvertime = await _overtimeRequests.GetSingleOrDefaultAsync(x => x.EmployeeId == employee.Id && x.Date == date.Date);
            var result = OvertimeCalculator.Calculate(employee, date, dayEntries, approvedLeaves, existingOvertime);

            if (result.SuggestedAction == OvertimeCalculationAction.Create)
                await _overtimeRequests.InsertAsync(new OvertimeRequest(employee.Id, date, result.CalculatedOvertimeHours, CurrentUser(userContext)));
            else if (result.SuggestedAction == OvertimeCalculationAction.UpdatePending && existingOvertime != null)
            {
                existingOvertime.UpdateCalculatedHours(result.CalculatedOvertimeHours, CurrentUser(userContext));
                await _overtimeRequests.InsertOrReplace(existingOvertime);
            }
        }

        private void EnsureCanModify(TimeEntry timeEntry, WorkLogUserContext userContext)
        {
            if (userContext != null && userContext.IsAdmin())
                return;
            if (DateTime.UtcNow.Date > timeEntry.Date.Date.AddDays(1))
                throw new ArgumentException("Employees can modify time entries only until the day after the entry date.");
        }

        private async Task<TimeEntry> GetTimeEntryOrThrow(Guid timeEntryId)
        {
            var timeEntry = await _timeEntries.GetSingleOrDefaultAsync(x => x.Id == timeEntryId);
            if (timeEntry == null)
                throw new ArgumentException("Time entry not found.");
            return timeEntry;
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

        private async Task<WorkItem> GetWorkItemOrThrow(Guid workItemId)
        {
            var workItem = await _workItems.GetSingleOrDefaultAsync(x => x.Id == workItemId);
            if (workItem == null)
                throw new ArgumentException("Work item not found.");
            return workItem;
        }

        private async Task<Project> GetProjectOrThrow(Guid projectId)
        {
            var project = await _projects.GetSingleOrDefaultAsync(x => x.Id == projectId);
            if (project == null)
                throw new ArgumentException("Project not found.");
            return project;
        }

        private static decimal GetProjectRateSnapshot(Project project, EmployeeLevel level)
        {
            if (project.PaymentType != ProjectPaymentType.TimeAndMaterial)
                return 0;
            if (level == EmployeeLevel.Junior)
                return project.JuniorRate.GetValueOrDefault();
            if (level == EmployeeLevel.Mid)
                return project.MidRate.GetValueOrDefault();
            return project.SeniorRate.GetValueOrDefault();
        }

        private async Task<TimeEntryDetailDto> BuildTimeEntryDetailAsync(TimeEntry timeEntry, WorkLogUserContext userContext)
        {
            var item = (await BuildTimeEntryListAsync(new List<TimeEntry> { timeEntry }, userContext)).Single();
            return new TimeEntryDetailDto
            {
                Id = item.Id,
                EmployeeId = item.EmployeeId,
                EmployeeName = item.EmployeeName,
                WorkItemId = item.WorkItemId,
                WorkItemCode = item.WorkItemCode,
                WorkItemTitle = item.WorkItemTitle,
                ProjectId = item.ProjectId,
                ProjectName = item.ProjectName,
                CustomerId = item.CustomerId,
                CustomerName = item.CustomerName,
                Date = item.Date,
                Time = item.Time,
                ApprovedTime = item.ApprovedTime,
                Description = item.Description,
                Notes = item.Notes,
                Status = item.Status,
                AdminNote = item.AdminNote,
                EmployeeLevelSnapshot = item.EmployeeLevelSnapshot,
                EmployeeDefaultRateSnapshot = item.EmployeeDefaultRateSnapshot,
                ProjectRateSnapshot = item.ProjectRateSnapshot,
                CalculatedValue = item.CalculatedValue
            };
        }

        private async Task<List<TimeEntryListItemDto>> BuildTimeEntryListAsync(List<TimeEntry> timeEntries, WorkLogUserContext userContext)
        {
            if (!timeEntries.Any())
                return new List<TimeEntryListItemDto>();

            var employeeIds = timeEntries.Select(x => x.EmployeeId).Distinct().ToList();
            var workItemIds = timeEntries.Select(x => x.WorkItemId).Distinct().ToList();
            var projectIds = timeEntries.Select(x => x.ProjectId).Distinct().ToList();
            var employees = await _employees.Get(x => employeeIds.Contains(x.Id));
            var workItems = await _workItems.Get(x => workItemIds.Contains(x.Id));
            var projects = projectIds.Any() ? await _projects.Get(x => projectIds.Contains(x.Id)) : new List<Project>();
            var customerIds = projects.Select(x => x.CustomerId).Distinct().ToList();
            var customers = customerIds.Any() ? await _customers.Get(x => customerIds.Contains(x.Id)) : new List<Customer>();

            var employeesById = employees.ToDictionary(x => x.Id);
            var workItemsById = workItems.ToDictionary(x => x.Id);
            var projectsById = projects.ToDictionary(x => x.Id);
            var customersById = customers.ToDictionary(x => x.Id);
            return timeEntries.Select(x => MapListItem(x, employeesById, workItemsById, projectsById, customersById, userContext)).ToList();
        }

        private static TimeEntryListItemDto MapListItem(TimeEntry timeEntry, Dictionary<Guid, Employee> employeesById, Dictionary<Guid, WorkItem> workItemsById, Dictionary<Guid, Project> projectsById, Dictionary<Guid, Customer> customersById, WorkLogUserContext userContext)
        {
            employeesById.TryGetValue(timeEntry.EmployeeId, out var employee);
            workItemsById.TryGetValue(timeEntry.WorkItemId, out var workItem);
            var project = projectsById.TryGetValue(timeEntry.ProjectId, out var projectValue) ? projectValue : null;
            var customer = project != null && customersById.TryGetValue(project.CustomerId, out var customerValue) ? customerValue : null;
            var isAdmin = userContext != null && userContext.IsAdmin();
            return new TimeEntryListItemDto
            {
                Id = timeEntry.Id,
                EmployeeId = timeEntry.EmployeeId,
                EmployeeName = employee == null ? null : string.Concat(employee.FirstName, " ", employee.LastName),
                WorkItemId = timeEntry.WorkItemId,
                WorkItemCode = workItem?.Code,
                WorkItemTitle = workItem?.Title,
                ProjectId = timeEntry.ProjectId,
                ProjectName = project?.Name,
                CustomerId = customer?.Id ?? Guid.Empty,
                CustomerName = customer?.CompanyName,
                Date = timeEntry.Date,
                Time = timeEntry.Time,
                ApprovedTime = isAdmin ? timeEntry.ApprovedTime : (decimal?)null,
                Description = timeEntry.Description,
                Notes = timeEntry.Notes,
                Status = timeEntry.Status,
                AdminNote = isAdmin ? timeEntry.AdminNote : null,
                EmployeeLevelSnapshot = isAdmin ? timeEntry.EmployeeLevelSnapshot : (EmployeeLevel?)null,
                EmployeeDefaultRateSnapshot = isAdmin ? timeEntry.EmployeeDefaultRateSnapshot : (decimal?)null,
                ProjectRateSnapshot = isAdmin ? timeEntry.ProjectRateSnapshot : (decimal?)null,
                CalculatedValue = isAdmin ? timeEntry.ApprovedTime * (timeEntry.ProjectRateSnapshot > 0 ? timeEntry.ProjectRateSnapshot : timeEntry.EmployeeDefaultRateSnapshot) : (decimal?)null
            };
        }

        private static string CurrentUser(WorkLogUserContext userContext)
        {
            return string.IsNullOrWhiteSpace(userContext?.Email) ? "system" : userContext.Email;
        }
    }
}
