using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SC.WorkLog.Application.DTO.Common;
using SC.WorkLog.Application.DTO.ContractPeriods;
using SC.WorkLog.Application.DTO.Customers;
using SC.WorkLog.Application.DTO.Payments;
using SC.WorkLog.Application.DTO.Projects;
using SC.WorkLog.Application.DTO.Reports;
using SC.WorkLog.Application.Validation;
using SC.WorkLog.Domain.AggregateRoots;
using SC.WorkLog.Domain.Enums;
using SC.WorkLog.Domain.Interfaces;

namespace SC.WorkLog.Application.Services
{
    public class ProjectService
    {
        private readonly IRepository<Project> _projects;
        private readonly IRepository<Customer> _customers;
        private readonly IRepository<ProjectMilestone> _projectMilestones;
        private readonly IRepository<WorkItem> _workItems;
        private readonly IRepository<TimeEntry> _timeEntries;
        private readonly IRepository<ProjectPayment> _projectPayments;
        private readonly IRepository<ProjectContractPeriod> _contractPeriods;
        private readonly IRepository<Employee> _employees;
        private readonly IRepository<StatusConfig> _statusConfigs;
        private readonly ProjectReportService _projectReportService;

        public ProjectService(
            IRepository<Project> projects,
            IRepository<Customer> customers,
            IRepository<ProjectMilestone> projectMilestones,
            IRepository<WorkItem> workItems,
            IRepository<TimeEntry> timeEntries,
            IRepository<ProjectPayment> projectPayments,
            IRepository<ProjectContractPeriod> contractPeriods,
            IRepository<Employee> employees,
            IRepository<StatusConfig> statusConfigs,
            ProjectReportService projectReportService)
        {
            _projects = projects;
            _customers = customers;
            _projectMilestones = projectMilestones;
            _workItems = workItems;
            _timeEntries = timeEntries;
            _projectPayments = projectPayments;
            _contractPeriods = contractPeriods;
            _employees = employees;
            _statusConfigs = statusConfigs;
            _projectReportService = projectReportService;
        }

        public async Task<List<ProjectListItemDto>> GetProjectsAsync(WorkLogUserContext userContext)
        {
            var projects = await _projects.Get(x => true, sortOrder: x => x.Name);
            return await BuildProjectListAsync(projects);
        }

        public async Task<List<ProjectListItemDto>> SearchProjectsAsync(string search, Guid? customerId, ProjectStatus? status, ProjectPaymentType? paymentType, WorkLogUserContext userContext)
        {
            var projects = await _projects.Get(x => (!customerId.HasValue || x.CustomerId == customerId.Value)
                && (!status.HasValue || x.Status == status.Value)
                && (!paymentType.HasValue || x.PaymentType == paymentType.Value), sortOrder: x => x.Name);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var value = search.Trim().ToLowerInvariant();
                projects = projects.Where(x => x.Name.ToLowerInvariant().Contains(value)).ToList();
            }

            return await BuildProjectListAsync(projects);
        }

        public async Task<ProjectDetailDto> GetProjectDetailAsync(Guid projectId, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.Required(projectId, nameof(projectId));
            var project = await GetProjectOrThrow(projectId);
            var customer = await _customers.GetSingleOrDefaultAsync(x => x.Id == project.CustomerId);
            var milestones = await _projectMilestones.Get(x => x.ProjectId == projectId, sortOrder: x => x.Date);
            var workItems = await _workItems.Get(x => x.ProjectId == projectId);
            var statusConfigs = await GetStatusConfigsForWorkItems(workItems);
            var timeEntries = await _timeEntries.Get(x => x.ProjectId == projectId);
            var employeeIds = timeEntries.Select(x => x.EmployeeId).Distinct().ToList();
            var employees = employeeIds.Any()
                ? await _employees.Get(x => employeeIds.Contains(x.Id))
                : new List<Employee>();

            return new ProjectDetailDto
            {
                Id = project.Id,
                CustomerId = project.CustomerId,
                Customer = customer == null ? null : MapCustomerListItem(customer),
                Name = project.Name,
                PaymentType = project.PaymentType,
                Status = project.Status,
                Notes = project.Notes,
                JuniorRate = userContext != null && userContext.IsAdmin() ? project.JuniorRate : null,
                MidRate = userContext != null && userContext.IsAdmin() ? project.MidRate : null,
                SeniorRate = userContext != null && userContext.IsAdmin() ? project.SeniorRate : null,
                FixedAmount = userContext != null && userContext.IsAdmin() ? project.FixedAmount : null,
                Milestones = milestones.Select(MapMilestone).ToList(),
                HoursSummary = new ProjectHoursSummaryDto
                {
                    LoggedHours = timeEntries.Sum(x => x.Time),
                    ApprovedHours = userContext != null && userContext.IsAdmin() ? timeEntries.Sum(x => x.ApprovedTime) : 0
                },
                WorkItemSummary = MapWorkItemSummary(workItems, statusConfigs.ToDictionary(x => x.Key)),
                TeamSummary = MapTeamSummary(timeEntries, employees.ToDictionary(x => x.Id), userContext),
                EconomicsSummary = userContext != null && userContext.IsAdmin() ? await GetProjectEconomicsAsync(projectId, userContext) : null,
                Capabilities = MapCapabilities(project, userContext)
            };
        }

        public Task<ProjectEconomicsDto> GetProjectEconomicsAsync(Guid projectId, WorkLogUserContext userContext)
        {
            return _projectReportService.GetProjectEconomicsAsync(projectId, userContext);
        }

        public async Task<ProjectDetailDto> CreateProjectAsync(CreateProjectRequest request, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(CreateProjectAsync));
            WorkLogApplicationValidation.Required(request.CustomerId, nameof(request.CustomerId));
            WorkLogApplicationValidation.Required(request.Name, nameof(request.Name));
            var customer = await _customers.GetSingleOrDefaultAsync(x => x.Id == request.CustomerId);
            if (customer == null)
                throw new ArgumentException("Customer not found.");

            var project = new Project(request.CustomerId, request.Name, request.PaymentType, request.Status, request.Notes, request.JuniorRate, request.MidRate, request.SeniorRate, request.FixedAmount, CurrentUser(userContext));
            await _projects.InsertAsync(project);
            return await GetProjectDetailAsync(project.Id, userContext);
        }

        public async Task<ProjectDetailDto> UpdateProjectAsync(UpdateProjectRequest request, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(UpdateProjectAsync));
            WorkLogApplicationValidation.Required(request.Id, nameof(request.Id));
            WorkLogApplicationValidation.Required(request.CustomerId, nameof(request.CustomerId));
            WorkLogApplicationValidation.Required(request.Name, nameof(request.Name));
            var project = await GetProjectOrThrow(request.Id);
            var customer = await _customers.GetSingleOrDefaultAsync(x => x.Id == request.CustomerId);
            if (customer == null)
                throw new ArgumentException("Customer not found.");
            project.Update(request.CustomerId, request.Name, request.PaymentType, request.Status, request.Notes, request.JuniorRate, request.MidRate, request.SeniorRate, request.FixedAmount, CurrentUser(userContext));
            await _projects.InsertOrReplace(project);
            return await GetProjectDetailAsync(project.Id, userContext);
        }

        public async Task<ProjectMilestoneDto> CreateProjectMilestoneAsync(ProjectMilestoneDto request, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(CreateProjectMilestoneAsync));
            WorkLogApplicationValidation.Required(request.ProjectId, nameof(request.ProjectId));
            WorkLogApplicationValidation.Required(request.Title, nameof(request.Title));
            WorkLogApplicationValidation.Required(request.Date, nameof(request.Date));
            await GetProjectOrThrow(request.ProjectId);
            var milestone = new ProjectMilestone(request.ProjectId, request.Title, request.Date, CurrentUser(userContext));
            await _projectMilestones.InsertAsync(milestone);
            return MapMilestone(milestone);
        }

        public async Task<ProjectMilestoneDto> UpdateProjectMilestoneAsync(ProjectMilestoneDto request, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(UpdateProjectMilestoneAsync));
            WorkLogApplicationValidation.Required(request.ProjectId, nameof(request.ProjectId));
            WorkLogApplicationValidation.Required(request.Id, nameof(request.Id));
            WorkLogApplicationValidation.Required(request.Title, nameof(request.Title));
            WorkLogApplicationValidation.Required(request.Date, nameof(request.Date));
            await GetProjectOrThrow(request.ProjectId);
            var milestone = await _projectMilestones.GetSingleOrDefaultAsync(x => x.Id == request.Id);
            if (milestone == null)
                throw new ArgumentException("Project milestone not found.");
            if (milestone.ProjectId != request.ProjectId)
                throw new ArgumentException("Project milestone does not belong to the specified project.");
            milestone.Update(request.Title, request.Date, CurrentUser(userContext));
            await _projectMilestones.InsertOrReplace(milestone);
            return MapMilestone(milestone);
        }

        public async Task DeleteProjectMilestoneAsync(ProjectMilestoneDto request, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(DeleteProjectMilestoneAsync));
            WorkLogApplicationValidation.Required(request.ProjectId, nameof(request.ProjectId));
            WorkLogApplicationValidation.Required(request.Id, nameof(request.Id));
            await GetProjectOrThrow(request.ProjectId);
            var milestone = await _projectMilestones.GetSingleOrDefaultAsync(x => x.Id == request.Id);
            if (milestone == null)
                throw new ArgumentException("Project milestone not found.");
            if (milestone.ProjectId != request.ProjectId)
                throw new ArgumentException("Project milestone does not belong to the specified project.");
            await _projectMilestones.Delete(milestone);
        }

        public async Task<List<ProjectPaymentDto>> GetProjectPaymentsAsync(Guid projectId, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(GetProjectPaymentsAsync));
            WorkLogApplicationValidation.Required(projectId, nameof(projectId));
            var payments = await _projectPayments.Get(x => x.ProjectId == projectId, sortOrder: x => x.PaymentDate);
            return payments.Select(MapPayment).ToList();
        }

        public async Task<ProjectPaymentDto> CreateProjectPaymentAsync(CreateProjectPaymentRequest request, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(CreateProjectPaymentAsync));
            WorkLogApplicationValidation.Required(request.ProjectId, nameof(request.ProjectId));
            WorkLogApplicationValidation.Positive(request.Amount, nameof(request.Amount));
            var project = await GetProjectOrThrow(request.ProjectId);
            WorkLogApplicationValidation.EnsureProjectPaymentAllowed(project.PaymentType);
            var payment = new ProjectPayment(request.ProjectId, request.PaymentDate, request.Amount, request.Note, CurrentUser(userContext));
            payment.EnsureCompatibleWith(project);
            await _projectPayments.InsertAsync(payment);
            return MapPayment(payment);
        }

        public async Task<ProjectPaymentDto> UpdateProjectPaymentAsync(UpdateProjectPaymentRequest request, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(UpdateProjectPaymentAsync));
            WorkLogApplicationValidation.Required(request.Id, nameof(request.Id));
            WorkLogApplicationValidation.Positive(request.Amount, nameof(request.Amount));
            var payment = await _projectPayments.GetSingleOrDefaultAsync(x => x.Id == request.Id);
            if (payment == null)
                throw new ArgumentException("Project payment not found.");
            var project = await GetProjectOrThrow(payment.ProjectId);
            payment.EnsureCompatibleWith(project);
            payment.Update(request.PaymentDate, request.Amount, request.Note, CurrentUser(userContext));
            await _projectPayments.InsertOrReplace(payment);
            return MapPayment(payment);
        }

        public async Task DeleteProjectPaymentAsync(DeleteProjectPaymentRequest request, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(DeleteProjectPaymentAsync));
            WorkLogApplicationValidation.Required(request.ProjectId, nameof(request.ProjectId));
            WorkLogApplicationValidation.Required(request.PaymentId, nameof(request.PaymentId));
            var payment = await _projectPayments.GetSingleOrDefaultAsync(x => x.Id == request.PaymentId);
            if (payment == null)
                throw new ArgumentException("Project payment not found.");
            if (payment.ProjectId != request.ProjectId)
                throw new ArgumentException("Project payment does not belong to the specified project.");
            var project = await GetProjectOrThrow(request.ProjectId);
            payment.EnsureCompatibleWith(project);
            await _projectPayments.Delete(payment);
        }

        public async Task<List<ProjectContractPeriodDto>> GetProjectContractPeriodsAsync(Guid projectId, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(GetProjectContractPeriodsAsync));
            WorkLogApplicationValidation.Required(projectId, nameof(projectId));
            var project = await GetProjectOrThrow(projectId);
            var periods = await _contractPeriods.Get(x => x.ProjectId == projectId, sortOrder: x => x.StartDate);
            if (project.PaymentType != ProjectPaymentType.AnnualRetainer)
                return periods.Select(MapContractPeriod).ToList();

            var workItems = await _workItems.Get(x => x.ProjectId == projectId);
            var timeEntries = await _timeEntries.Get(x => x.ProjectId == projectId);
            var economicsByPeriodId = _projectReportService.CalculateAnnualRetainerEconomics(project, periods, workItems, timeEntries, AdminContext())
                .ToDictionary(x => x.ContractPeriodId);

            return periods.Select(period =>
            {
                var row = MapContractPeriod(period);
                if (economicsByPeriodId.TryGetValue(period.Id, out var periodEconomics))
                {
                    row.InternalValueUsed = periodEconomics.InternalValueUsed;
                    row.ApprovedHours = periodEconomics.ApprovedHours;
                    row.Balance = periodEconomics.Balance;
                    row.ConsumptionPercentage = periodEconomics.ConsumptionPercentage;
                    row.Status = periodEconomics.Status;
                }
                return row;
            }).ToList();
        }

        public async Task<ProjectContractPeriodDto> CreateProjectContractPeriodAsync(CreateProjectContractPeriodRequest request, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(CreateProjectContractPeriodAsync));
            WorkLogApplicationValidation.Required(request.ProjectId, nameof(request.ProjectId));
            WorkLogApplicationValidation.Positive(request.Amount, nameof(request.Amount));
            WorkLogApplicationValidation.ValidDateRange(request.StartDate, request.EndDate, nameof(request.EndDate));
            var project = await GetProjectOrThrow(request.ProjectId);
            WorkLogApplicationValidation.EnsureContractPeriodAllowed(project.PaymentType);
            await EnsureNoOverlappingPeriod(request.ProjectId, request.StartDate, request.EndDate, null);
            var period = new ProjectContractPeriod(request.ProjectId, request.StartDate, request.EndDate, request.Amount, request.PaymentDate, request.Note, CurrentUser(userContext));
            period.EnsureCompatibleWith(project);
            await _contractPeriods.InsertAsync(period);
            return MapContractPeriod(period);
        }

        public async Task<ProjectContractPeriodDto> UpdateProjectContractPeriodAsync(UpdateProjectContractPeriodRequest request, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(UpdateProjectContractPeriodAsync));
            WorkLogApplicationValidation.Required(request.Id, nameof(request.Id));
            WorkLogApplicationValidation.Positive(request.Amount, nameof(request.Amount));
            WorkLogApplicationValidation.ValidDateRange(request.StartDate, request.EndDate, nameof(request.EndDate));
            var period = await _contractPeriods.GetSingleOrDefaultAsync(x => x.Id == request.Id);
            if (period == null)
                throw new ArgumentException("Project contract period not found.");
            var project = await GetProjectOrThrow(period.ProjectId);
            period.EnsureCompatibleWith(project);
            await EnsureNoOverlappingPeriod(period.ProjectId, request.StartDate, request.EndDate, period.Id);
            period.Update(request.StartDate, request.EndDate, request.Amount, request.PaymentDate, request.Note, CurrentUser(userContext));
            await _contractPeriods.InsertOrReplace(period);
            return MapContractPeriod(period);
        }

        public async Task DeleteProjectContractPeriodAsync(DeleteProjectContractPeriodRequest request, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(DeleteProjectContractPeriodAsync));
            WorkLogApplicationValidation.Required(request.ProjectId, nameof(request.ProjectId));
            WorkLogApplicationValidation.Required(request.ContractPeriodId, nameof(request.ContractPeriodId));
            var period = await _contractPeriods.GetSingleOrDefaultAsync(x => x.Id == request.ContractPeriodId);
            if (period == null)
                throw new ArgumentException("Project contract period not found.");
            if (period.ProjectId != request.ProjectId)
                throw new ArgumentException("Project contract period does not belong to the specified project.");
            var project = await GetProjectOrThrow(request.ProjectId);
            period.EnsureCompatibleWith(project);
            await _contractPeriods.Delete(period);
        }

        private async Task<Project> GetProjectOrThrow(Guid projectId)
        {
            var project = await _projects.GetSingleOrDefaultAsync(x => x.Id == projectId);
            if (project == null)
                throw new ArgumentException("Project not found.");
            return project;
        }

        private async Task<List<ProjectListItemDto>> BuildProjectListAsync(List<Project> projects)
        {
            if (!projects.Any())
                return new List<ProjectListItemDto>();

            var projectIds = projects.Select(x => x.Id).Distinct().ToList();
            var customerIds = projects.Select(x => x.CustomerId).Distinct().ToList();
            var customers = await _customers.Get(x => customerIds.Contains(x.Id));
            var workItems = await _workItems.Get(x => projectIds.Contains(x.ProjectId));
            var statusConfigs = await GetStatusConfigsForWorkItems(workItems);
            var timeEntries = projectIds.Any()
                ? await _timeEntries.Get(x => projectIds.Contains(x.ProjectId))
                : new List<TimeEntry>();

            var customersById = customers.ToDictionary(x => x.Id);
            var workItemsByProjectId = workItems.GroupBy(x => x.ProjectId).ToDictionary(x => x.Key, x => x.ToList());
            var timeEntriesByProjectId = timeEntries.GroupBy(x => x.ProjectId).ToDictionary(x => x.Key, x => x.ToList());
            var statusConfigsByKey = statusConfigs.ToDictionary(x => x.Key);

            return projects.Select(project => MapProjectListItem(project, customersById, workItemsByProjectId, timeEntriesByProjectId, statusConfigsByKey)).ToList();
        }

        private static ProjectListItemDto MapProjectListItem(Project project, Dictionary<Guid, Customer> customersById, Dictionary<Guid, List<WorkItem>> workItemsByProjectId, Dictionary<Guid, List<TimeEntry>> timeEntriesByProjectId, Dictionary<string, StatusConfig> statusConfigsByKey)
        {
            workItemsByProjectId.TryGetValue(project.Id, out var projectWorkItems);
            projectWorkItems = projectWorkItems ?? new List<WorkItem>();
            timeEntriesByProjectId.TryGetValue(project.Id, out var projectTimeEntries);
            var loggedHours = (projectTimeEntries ?? new List<TimeEntry>()).Sum(x => x.Time);

            return new ProjectListItemDto
            {
                Id = project.Id,
                CustomerId = project.CustomerId,
                CustomerName = customersById.TryGetValue(project.CustomerId, out var customer) ? customer.CompanyName : null,
                Name = project.Name,
                PaymentType = project.PaymentType,
                Status = project.Status,
                LoggedHours = loggedHours,
                WorkItemCount = projectWorkItems.Count,
                OpenWorkItemCount = projectWorkItems.Count(workItem => IsOpenWorkItem(workItem, statusConfigsByKey))
            };
        }

        private static ProjectWorkItemSummaryDto MapWorkItemSummary(List<WorkItem> workItems, Dictionary<string, StatusConfig> statusConfigsByKey)
        {
            return new ProjectWorkItemSummaryDto
            {
                Total = workItems.Count,
                New = workItems.Count(x => StatusFor(x, statusConfigsByKey).Typology == WorkItemStatusTypology.New),
                InProgress = workItems.Count(x => StatusFor(x, statusConfigsByKey).Typology == WorkItemStatusTypology.InProgress),
                WaitingInternal = workItems.Count(x => StatusFor(x, statusConfigsByKey).Typology == WorkItemStatusTypology.WaitingInternal),
                WaitingCustomer = workItems.Count(x => StatusFor(x, statusConfigsByKey).Typology == WorkItemStatusTypology.WaitingCustomer),
                Closed = workItems.Count(x => StatusFor(x, statusConfigsByKey).Typology == WorkItemStatusTypology.Closed),
                Archived = workItems.Count(x => StatusFor(x, statusConfigsByKey).Typology == WorkItemStatusTypology.Archived),
                Unassigned = workItems.Count(x => !x.AssigneeId.HasValue)
            };
        }

        private static List<ProjectTeamMemberDto> MapTeamSummary(List<TimeEntry> timeEntries, Dictionary<Guid, Employee> employeesById, WorkLogUserContext userContext)
        {
            return timeEntries.GroupBy(x => x.EmployeeId).Select(group =>
            {
                employeesById.TryGetValue(group.Key, out var employee);
                return new ProjectTeamMemberDto
                {
                    EmployeeId = group.Key,
                    FullName = employee == null ? null : string.Concat(employee.FirstName, " ", employee.LastName),
                    Level = userContext != null && userContext.IsAdmin() ? (employee == null ? group.First().EmployeeLevelSnapshot : employee.Level) : (EmployeeLevel?)null,
                    LoggedHours = group.Sum(x => x.Time),
                    ApprovedHours = userContext != null && userContext.IsAdmin() ? group.Sum(x => x.ApprovedTime) : 0
                };
            }).ToList();
        }

        private static ProjectCapabilitiesDto MapCapabilities(Project project, WorkLogUserContext userContext)
        {
            var isAdmin = userContext != null && userContext.IsAdmin();
            return new ProjectCapabilitiesDto
            {
                CanViewEconomics = isAdmin,
                CanViewPayments = isAdmin && project.PaymentType == ProjectPaymentType.TimeAndMaterial,
                CanViewContractPeriods = isAdmin && project.PaymentType == ProjectPaymentType.AnnualRetainer,
                CanEditProjectSettings = isAdmin
            };
        }

        private async Task EnsureNoOverlappingPeriod(Guid projectId, DateTime startDate, DateTime endDate, Guid? currentPeriodId)
        {
            var periods = await _contractPeriods.Get(x => x.ProjectId == projectId && startDate.Date <= x.EndDate && endDate.Date >= x.StartDate);
            var overlaps = periods.Any(x => x.Id != currentPeriodId.GetValueOrDefault());
            if (overlaps)
                throw new ArgumentException("Project contract periods cannot overlap.");
        }

        private async Task<List<StatusConfig>> GetStatusConfigsForWorkItems(IEnumerable<WorkItem> workItems)
        {
            var statusKeys = workItems.Select(x => x.StatusKey).Distinct().ToList();
            return statusKeys.Any()
                ? await _statusConfigs.Get(x => statusKeys.Contains(x.Key))
                : new List<StatusConfig>();
        }

        private static bool IsOpenWorkItem(WorkItem workItem, Dictionary<string, StatusConfig> statusConfigsByKey)
        {
            return StatusFor(workItem, statusConfigsByKey).IsOpen();
        }

        private static StatusConfig StatusFor(WorkItem workItem, Dictionary<string, StatusConfig> statusConfigsByKey)
        {
            if (!statusConfigsByKey.TryGetValue(workItem.StatusKey, out var statusConfig))
                throw new ArgumentException("Status config not found for work item.");
            return statusConfig;
        }

        private static CustomerListItemDto MapCustomerListItem(Customer customer)
        {
            return new CustomerListItemDto
            {
                Id = customer.Id,
                CompanyName = customer.CompanyName,
                CompanyDomain = customer.CompanyDomain,
                ContactPerson = customer.ContactPerson,
                ContactEmail = customer.ContactEmail,
                ContactPhone = customer.ContactPhone,
                Active = customer.Active
            };
        }

        private static ProjectMilestoneDto MapMilestone(ProjectMilestone milestone)
        {
            return new ProjectMilestoneDto { Id = milestone.Id, ProjectId = milestone.ProjectId, Title = milestone.Title, Date = milestone.Date };
        }

        private static ProjectPaymentDto MapPayment(ProjectPayment payment)
        {
            return new ProjectPaymentDto
            {
                Id = payment.Id,
                ProjectId = payment.ProjectId,
                PaymentDate = payment.PaymentDate,
                Amount = payment.Amount,
                Note = payment.Note,
                CreatedOn = payment.AuditInfo.CreatedOn,
                CreatedBy = payment.AuditInfo.CreatedBy
            };
        }

        private static ProjectContractPeriodDto MapContractPeriod(ProjectContractPeriod period)
        {
            return new ProjectContractPeriodDto
            {
                Id = period.Id,
                ProjectId = period.ProjectId,
                StartDate = period.StartDate,
                EndDate = period.EndDate,
                Amount = period.Amount,
                PaymentDate = period.PaymentDate,
                Note = period.Note
            };
        }

        private static WorkLogUserContext AdminContext()
        {
            return new WorkLogUserContext { Role = ApplicationUserRole.Admin, Email = "system" };
        }

        private static string CurrentUser(WorkLogUserContext userContext)
        {
            return string.IsNullOrWhiteSpace(userContext?.Email) ? "system" : userContext.Email;
        }
    }
}
