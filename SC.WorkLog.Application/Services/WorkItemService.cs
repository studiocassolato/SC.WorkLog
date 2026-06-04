using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SC.WorkLog.Application.DTO.Common;
using SC.WorkLog.Application.DTO.WorkItems;
using SC.WorkLog.Application.Validation;
using SC.WorkLog.Domain.AggregateRoots;
using SC.WorkLog.Domain.Enums;
using SC.WorkLog.Domain.Interfaces;

namespace SC.WorkLog.Application.Services
{
    public class WorkItemService
    {
        private readonly IRepository<WorkItem> _workItems;
        private readonly IRepository<Project> _projects;
        private readonly IRepository<Customer> _customers;
        private readonly IRepository<Employee> _employees;
        private readonly IRepository<TimeEntry> _timeEntries;
        private readonly IRepository<WorkItemComment> _comments;
        private readonly IRepository<StatusConfig> _statusConfigs;

        public WorkItemService(IRepository<WorkItem> workItems, IRepository<Project> projects, IRepository<Customer> customers, IRepository<Employee> employees, IRepository<TimeEntry> timeEntries, IRepository<WorkItemComment> comments, IRepository<StatusConfig> statusConfigs)
        {
            _workItems = workItems;
            _projects = projects;
            _customers = customers;
            _employees = employees;
            _timeEntries = timeEntries;
            _comments = comments;
            _statusConfigs = statusConfigs;
        }

        public async Task<List<WorkItemListItemDto>> GetWorkItemsAsync(WorkItemFilter filter, WorkLogUserContext userContext)
        {
            filter = filter ?? new WorkItemFilter();
            var projectIdsForCustomer = new List<Guid>();

            if (filter.CustomerId.HasValue)
            {
                var customerProjects = await _projects.Get(x => x.CustomerId == filter.CustomerId.Value);
                projectIdsForCustomer = customerProjects.Select(x => x.Id).ToList();
                if (!projectIdsForCustomer.Any())
                    return new List<WorkItemListItemDto>();
            }

            var statusConfigs = await _statusConfigs.Get(x => true);
            var closedStatusKeys = statusConfigs.Where(x => x.IsClosed()).Select(x => x.Key).ToList();
            var statusTypologyKeys = filter.StatusTypology.HasValue
                ? statusConfigs.Where(x => x.Typology == filter.StatusTypology.Value).Select(x => x.Key).ToList()
                : new List<string>();
            var statusKey = string.IsNullOrWhiteSpace(filter.StatusKey) ? null : StatusConfig.NormalizeKey(filter.StatusKey);

            var workItems = await _workItems.Get(x => (!filter.ProjectId.HasValue || x.ProjectId == filter.ProjectId.Value)
                && (!filter.CustomerId.HasValue || projectIdsForCustomer.Contains(x.ProjectId))
                && (!filter.AssigneeId.HasValue || x.AssigneeId == filter.AssigneeId.Value)
                && (statusKey == null || x.StatusKey == statusKey)
                && (!filter.StatusTypology.HasValue || statusTypologyKeys.Contains(x.StatusKey))
                && (!filter.Priority.HasValue || x.Priority == filter.Priority.Value)
                && (filter.IncludeClosed || !closedStatusKeys.Contains(x.StatusKey)));

            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                var value = filter.Search.Trim().ToLowerInvariant();
                workItems = workItems.Where(x => Contains(x.Code, value) || Contains(x.Title, value) || Contains(x.Description, value)).ToList();
            }

            return (await BuildWorkItemListAsync(workItems, userContext))
                .OrderByDescending(x => x.IsPriority)
                .ThenBy(x => x.OpeningDate)
                .ToList();
        }

        public async Task<WorkItemDetailDto> GetWorkItemDetailAsync(Guid workItemId, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.Required(workItemId, nameof(workItemId));
            var workItem = await GetWorkItemOrThrow(workItemId);
            var item = (await BuildWorkItemListAsync(new List<WorkItem> { workItem }, userContext)).Single();
            return MapDetail(item);
        }

        public async Task<WorkItemDetailDto> CreateWorkItemAsync(CreateWorkItemRequest request, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, "Create work item");
            WorkLogApplicationValidation.Required(request.ProjectId, nameof(request.ProjectId));
            WorkLogApplicationValidation.Required(request.Title, nameof(request.Title));
            var project = await _projects.GetSingleOrDefaultAsync(x => x.Id == request.ProjectId);
            if (project == null)
                throw new ArgumentException("Project not found.");
            if (request.AssigneeId.HasValue)
                await EnsureEmployeeExists(request.AssigneeId.Value);
            var statusConfig = await ResolveRequestStatusConfig(request.StatusKey);

            var closingDate = statusConfig.IsClosed() ? request.ClosingDate.GetValueOrDefault(DateTime.UtcNow) : (DateTime?)null;
            var workItem = new WorkItem(request.Code, request.ProjectId, request.Title, request.Description, statusConfig.Key, request.Priority, request.AssigneeId, request.Origin, request.ExternalReference, request.OpeningDate == default(DateTime) ? DateTime.UtcNow : request.OpeningDate, request.IsPriority, CurrentUser(userContext));
            if (closingDate.HasValue)
                workItem.ChangeStatus(statusConfig.Key, closingDate, CurrentUser(userContext));
            await _workItems.InsertAsync(workItem);
            return await GetWorkItemDetailAsync(workItem.Id, userContext);
        }

        public async Task<WorkItemDetailDto> UpdateWorkItemAsync(UpdateWorkItemRequest request, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, "Update work item");
            WorkLogApplicationValidation.Required(request.Id, nameof(request.Id));
            WorkLogApplicationValidation.Required(request.ProjectId, nameof(request.ProjectId));
            WorkLogApplicationValidation.Required(request.Title, nameof(request.Title));
            var workItem = await GetWorkItemOrThrow(request.Id);
            if (workItem.ProjectId != request.ProjectId)
                throw new ArgumentException("Work item project cannot be changed.");
            if (request.AssigneeId.HasValue)
                await EnsureEmployeeExists(request.AssigneeId.Value);
            var statusConfig = await ResolveRequestStatusConfig(request.StatusKey);

            workItem.UpdateDetails(request.Title, request.Description, request.Priority, request.AssigneeId, request.IsPriority, CurrentUser(userContext));
            workItem.ChangeStatus(statusConfig.Key, statusConfig.IsClosed() ? request.ClosingDate.GetValueOrDefault(DateTime.UtcNow) : null, CurrentUser(userContext));
            await _workItems.InsertOrReplace(workItem);
            return await GetWorkItemDetailAsync(workItem.Id, userContext);
        }

        public async Task AddCommentAsync(AddWorkItemCommentRequest request, WorkLogUserContext userContext)
        {
            if (userContext == null)
                throw new ArgumentException("Add work item comment requires a user context.");
            WorkLogApplicationValidation.Required(userContext.EmployeeId, nameof(userContext.EmployeeId));
            WorkLogApplicationValidation.Required(request.WorkItemId, nameof(request.WorkItemId));
            WorkLogApplicationValidation.Required(request.Content, nameof(request.Content));

            await GetWorkItemOrThrow(request.WorkItemId);
            await EnsureActiveEmployeeExists(userContext.EmployeeId);
            var comment = new WorkItemComment(request.WorkItemId, userContext.EmployeeId, request.Content, request.IsInternal, CurrentUser(userContext));
            await _comments.InsertAsync(comment);
        }

        private async Task<List<WorkItemListItemDto>> BuildWorkItemListAsync(List<WorkItem> workItems, WorkLogUserContext userContext)
        {
            if (!workItems.Any())
                return new List<WorkItemListItemDto>();

            var projectIds = workItems.Select(x => x.ProjectId).Distinct().ToList();
            var assigneeIds = workItems.Where(x => x.AssigneeId.HasValue).Select(x => x.AssigneeId.Value).Distinct().ToList();
            var workItemIds = workItems.Select(x => x.Id).Distinct().ToList();
            var statusKeys = workItems.Select(x => x.StatusKey).Distinct().ToList();

            var projects = await _projects.Get(x => projectIds.Contains(x.Id));
            var customerIds = projects.Select(x => x.CustomerId).Distinct().ToList();
            var customers = customerIds.Any() ? await _customers.Get(x => customerIds.Contains(x.Id)) : new List<Customer>();
            var employees = assigneeIds.Any() ? await _employees.Get(x => assigneeIds.Contains(x.Id)) : new List<Employee>();
            var timeEntries = await _timeEntries.Get(x => workItemIds.Contains(x.WorkItemId));
            var statuses = statusKeys.Any() ? await _statusConfigs.Get(x => statusKeys.Contains(x.Key)) : new List<StatusConfig>();

            var projectsById = projects.ToDictionary(x => x.Id);
            var customersById = customers.ToDictionary(x => x.Id);
            var employeesById = employees.ToDictionary(x => x.Id);
            var timeEntriesByWorkItemId = timeEntries.GroupBy(x => x.WorkItemId).ToDictionary(x => x.Key, x => x.ToList());
            var statusConfigsByKey = statuses.ToDictionary(x => x.Key);

            return workItems.Select(x => MapListItem(x, projectsById, customersById, employeesById, timeEntriesByWorkItemId, statusConfigsByKey, userContext)).ToList();
        }

        private static WorkItemListItemDto MapListItem(WorkItem workItem, Dictionary<Guid, Project> projectsById, Dictionary<Guid, Customer> customersById, Dictionary<Guid, Employee> employeesById, Dictionary<Guid, List<TimeEntry>> timeEntriesByWorkItemId, Dictionary<string, StatusConfig> statusConfigsByKey, WorkLogUserContext userContext)
        {
            projectsById.TryGetValue(workItem.ProjectId, out var project);
            var customer = project != null && customersById.TryGetValue(project.CustomerId, out var value) ? value : null;
            var assignee = workItem.AssigneeId.HasValue && employeesById.TryGetValue(workItem.AssigneeId.Value, out var employee) ? employee : null;
            var itemTime = timeEntriesByWorkItemId.TryGetValue(workItem.Id, out var entries) ? entries : new List<TimeEntry>();
            var status = statusConfigsByKey.TryGetValue(workItem.StatusKey, out var statusConfig) ? statusConfig : null;

            return new WorkItemListItemDto
            {
                Id = workItem.Id,
                Code = workItem.Code,
                ProjectId = workItem.ProjectId,
                ProjectName = project?.Name,
                CustomerId = project?.CustomerId ?? Guid.Empty,
                CustomerName = customer?.CompanyName,
                Title = workItem.Title,
                Description = workItem.Description,
                StatusKey = workItem.StatusKey,
                StatusName = status?.Name,
                StatusTypology = status?.Typology ?? WorkItemStatusTypology.New,
                CustomerDisplayName = status?.CustomerDisplayName,
                IsClosed = status?.IsClosed() ?? false,
                Priority = workItem.Priority,
                AssigneeId = workItem.AssigneeId,
                AssigneeName = assignee == null ? null : string.Concat(assignee.FirstName, " ", assignee.LastName),
                Origin = workItem.Origin,
                ExternalReference = workItem.ExternalReference,
                OpeningDate = workItem.OpeningDate,
                ClosingDate = workItem.ClosingDate,
                IsPriority = workItem.IsPriority,
                LoggedHours = itemTime.Sum(x => x.Time),
                ApprovedHours = userContext != null && userContext.IsAdmin() ? itemTime.Sum(x => x.ApprovedTime) : (decimal?)null
            };
        }

        private static WorkItemDetailDto MapDetail(WorkItemListItemDto item)
        {
            return new WorkItemDetailDto
            {
                Id = item.Id,
                Code = item.Code,
                ProjectId = item.ProjectId,
                ProjectName = item.ProjectName,
                CustomerId = item.CustomerId,
                CustomerName = item.CustomerName,
                Title = item.Title,
                Description = item.Description,
                StatusKey = item.StatusKey,
                StatusName = item.StatusName,
                StatusTypology = item.StatusTypology,
                CustomerDisplayName = item.CustomerDisplayName,
                IsClosed = item.IsClosed,
                Priority = item.Priority,
                AssigneeId = item.AssigneeId,
                AssigneeName = item.AssigneeName,
                Origin = item.Origin,
                ExternalReference = item.ExternalReference,
                OpeningDate = item.OpeningDate,
                ClosingDate = item.ClosingDate,
                IsPriority = item.IsPriority,
                LoggedHours = item.LoggedHours,
                ApprovedHours = item.ApprovedHours
            };
        }

        private async Task<WorkItem> GetWorkItemOrThrow(Guid workItemId)
        {
            var workItem = await _workItems.GetSingleOrDefaultAsync(x => x.Id == workItemId);
            if (workItem == null)
                throw new ArgumentException("Work item not found.");
            return workItem;
        }

        private async Task EnsureEmployeeExists(Guid employeeId)
        {
            var employee = await _employees.GetSingleOrDefaultAsync(x => x.Id == employeeId);
            if (employee == null)
                throw new ArgumentException("Employee not found.");
        }

        private async Task<StatusConfig> ResolveRequestStatusConfig(string requestedStatusKey)
        {
            var statusConfig = string.IsNullOrWhiteSpace(requestedStatusKey)
                ? await GetInitialStatusConfig()
                : await _statusConfigs.GetSingleOrDefaultAsync(x => x.Key == StatusConfig.NormalizeKey(requestedStatusKey));
            if (statusConfig == null || !statusConfig.Active)
                throw new ArgumentException("Active status config not found.");
            return statusConfig;
        }

        private async Task<StatusConfig> GetInitialStatusConfig()
        {
            var statuses = await _statusConfigs.Get(x => x.Active && x.Typology == WorkItemStatusTypology.New, sortOrder: x => x.Order);
            var status = statuses.FirstOrDefault();
            if (status == null)
                throw new ArgumentException("At least one active New status is required.");
            return status;
        }

        private async Task EnsureActiveEmployeeExists(Guid employeeId)
        {
            var employee = await _employees.GetSingleOrDefaultAsync(x => x.Id == employeeId);
            if (employee == null || !employee.Active)
                throw new ArgumentException("Active employee not found.");
        }

        private static bool Contains(string source, string value)
        {
            return !string.IsNullOrWhiteSpace(source) && source.ToLowerInvariant().Contains(value);
        }

        private static string CurrentUser(WorkLogUserContext userContext)
        {
            return string.IsNullOrWhiteSpace(userContext?.Email) ? "system" : userContext.Email;
        }
    }
}
