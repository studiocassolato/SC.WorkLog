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
    public class ProjectReportService
    {
        private readonly IRepository<Project> _projects;
        private readonly IRepository<WorkItem> _workItems;
        private readonly IRepository<TimeEntry> _timeEntries;
        private readonly IRepository<ProjectPayment> _projectPayments;
        private readonly IRepository<ProjectContractPeriod> _contractPeriods;
        private readonly IRepository<Customer> _customers;

        public ProjectReportService(IRepository<Project> projects, IRepository<WorkItem> workItems, IRepository<TimeEntry> timeEntries, IRepository<ProjectPayment> projectPayments, IRepository<ProjectContractPeriod> contractPeriods, IRepository<Customer> customers)
        {
            _projects = projects;
            _workItems = workItems;
            _timeEntries = timeEntries;
            _projectPayments = projectPayments;
            _contractPeriods = contractPeriods;
            _customers = customers;
        }

        public async Task<ProjectEconomicsDto> GetProjectEconomicsAsync(Guid projectId, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(GetProjectEconomicsAsync));
            WorkLogApplicationValidation.Required(projectId, nameof(projectId));
            var project = await GetProjectOrThrow(projectId);
            var workItems = await _workItems.Get(x => x.ProjectId == projectId);
            var timeEntries = await GetTimeEntriesForWorkItemsAsync(workItems);
            var dto = new ProjectEconomicsDto();

            if (project.PaymentType == ProjectPaymentType.TimeAndMaterial)
            {
                var payments = await _projectPayments.Get(x => x.ProjectId == projectId);
                dto.TimeAndMaterial = CalculateTimeAndMaterialEconomics(project, workItems, timeEntries, payments, userContext);
            }
            else if (project.PaymentType == ProjectPaymentType.FixedPrice)
                dto.FixedPrice = CalculateFixedPriceEconomics(project, workItems, timeEntries, userContext);
            else if (project.PaymentType == ProjectPaymentType.AnnualRetainer)
            {
                var periods = await _contractPeriods.Get(x => x.ProjectId == projectId, sortOrder: x => x.StartDate);
                dto.AnnualRetainerPeriods = CalculateAnnualRetainerEconomics(project, periods, workItems, timeEntries, userContext);
                dto.AnnualRetainer = dto.AnnualRetainerPeriods.FirstOrDefault(x => DateTime.UtcNow.Date >= x.StartDate && DateTime.UtcNow.Date <= x.EndDate) ?? dto.AnnualRetainerPeriods.FirstOrDefault();
            }
            else if (project.PaymentType == ProjectPaymentType.Internal)
                dto.Internal = CalculateInternalProjectEconomics(project, workItems, timeEntries, userContext);

            return dto;
        }

        public TimeAndMaterialEconomicsDto CalculateTimeAndMaterialEconomics(Project project, IEnumerable<WorkItem> workItems, IEnumerable<TimeEntry> timeEntries, IEnumerable<ProjectPayment> payments, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(CalculateTimeAndMaterialEconomics));
            var result = TimeAndMaterialEconomicsCalculator.Calculate(project, workItems, timeEntries, payments);
            return new TimeAndMaterialEconomicsDto
            {
                ApprovedHours = result.ApprovedHours,
                WorkedValue = result.WorkedValue,
                TotalPaymentsReceived = result.TotalPaymentsReceived,
                CurrentBalance = result.CurrentBalance,
                BalanceStatus = result.BalanceStatus,
                MonthlyRows = result.MonthlyRows.Select(x => new MonthlyBalanceRowDto
                {
                    Month = x.Month,
                    ApprovedHours = x.ApprovedHours,
                    WorkedValue = x.WorkedValue,
                    PaymentsReceived = x.PaymentsReceived,
                    MonthlyBalance = x.MonthlyBalance,
                    CumulativeBalance = x.CumulativeBalance
                }).ToList()
            };
        }

        public FixedPriceEconomicsDto CalculateFixedPriceEconomics(Project project, IEnumerable<WorkItem> workItems, IEnumerable<TimeEntry> timeEntries, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(CalculateFixedPriceEconomics));
            var result = FixedPriceEconomicsCalculator.Calculate(project, workItems, timeEntries);
            return new FixedPriceEconomicsDto
            {
                FixedAmount = project.FixedAmount.GetValueOrDefault(),
                ApprovedHours = result.ApprovedHours,
                InternalValueUsed = result.InternalValueUsed,
                BudgetConsumptionPercentage = result.BudgetConsumptionPercentage,
                EffectiveHourlyAverage = result.EffectiveHourlyAverage,
                RemainingTheoreticalMargin = result.RemainingTheoreticalMargin,
                OverBudget = result.OverBudget
            };
        }

        public List<AnnualRetainerEconomicsDto> CalculateAnnualRetainerEconomics(Project project, IEnumerable<ProjectContractPeriod> contractPeriods, IEnumerable<WorkItem> workItems, IEnumerable<TimeEntry> timeEntries, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(CalculateAnnualRetainerEconomics));
            var results = AnnualRetainerEconomicsCalculator.Calculate(project, contractPeriods, workItems, timeEntries);
            return results.Select(x => new AnnualRetainerEconomicsDto
            {
                ContractPeriodId = x.ContractPeriodId,
                StartDate = x.StartDate,
                EndDate = x.EndDate,
                Amount = x.Amount,
                ApprovedHours = x.ApprovedHours,
                InternalValueUsed = x.InternalValueUsed,
                Balance = x.Balance,
                ConsumptionPercentage = x.ConsumptionPercentage,
                Status = x.Status,
                MonthlyRows = x.MonthlyRows.Select(row => new RetainerMonthlyRowDto
                {
                    Month = row.Month,
                    ApprovedHours = row.ApprovedHours,
                    InternalValue = row.InternalValue,
                    CumulativeInternalValue = row.CumulativeInternalValue,
                    ExpectedCumulativeValue = row.ExpectedCumulativeValue,
                    Delta = row.Delta
                }).ToList()
            }).ToList();
        }

        public InternalProjectEconomicsDto CalculateInternalProjectEconomics(Project project, IEnumerable<WorkItem> workItems, IEnumerable<TimeEntry> timeEntries, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(CalculateInternalProjectEconomics));
            var result = InternalProjectEconomicsCalculator.Calculate(project, workItems, timeEntries);
            return new InternalProjectEconomicsDto
            {
                ApprovedHours = result.ApprovedHours,
                InternalValue = result.InternalValue,
                InternalValueByEmployee = result.InternalValueByEmployee.Select(x => new InternalValueByEmployeeDto
                {
                    EmployeeId = x.EmployeeId,
                    ApprovedHours = x.ApprovedHours,
                    InternalValue = x.InternalValue
                }).ToList(),
                MonthlyInternalValue = result.MonthlyInternalValue.Select(x => new MonthlyInternalValueDto
                {
                    Month = x.Month,
                    ApprovedHours = x.ApprovedHours,
                    InternalValue = x.InternalValue
                }).ToList()
            };
        }

        public async Task<CustomerReportDto> GetCustomerReportAsync(CustomerReportFilter filter, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(GetCustomerReportAsync));
            WorkLogApplicationValidation.ValidDateRange(filter.DateFrom, filter.DateTo, nameof(filter.DateTo));
            var projects = await LoadCustomerReportProjectsAsync(filter);
            if (!projects.Any())
                return EmptyCustomerReport(filter);

            var projectIds = projects.Select(x => x.Id).Distinct().ToList();
            var customerIds = projects.Select(x => x.CustomerId).Distinct().ToList();
            var customers = await _customers.Get(x => customerIds.Contains(x.Id));
            var workItems = await _workItems.Get(x => projectIds.Contains(x.ProjectId));
            var workItemIds = workItems.Select(x => x.Id).Distinct().ToList();
            var timeEntries = workItemIds.Any()
                ? await _timeEntries.Get(x => workItemIds.Contains(x.WorkItemId) && x.Date >= filter.DateFrom.Date && x.Date <= filter.DateTo.Date)
                : new List<TimeEntry>();

            var workItemsById = workItems.ToDictionary(x => x.Id);
            var projectsById = projects.ToDictionary(x => x.Id);
            var customersById = customers.ToDictionary(x => x.Id);
            var rows = timeEntries.Select(entry => MapCustomerReportRow(entry, workItemsById, projectsById, customersById)).ToList();

            return new CustomerReportDto
            {
                DateFrom = filter.DateFrom.Date,
                DateTo = filter.DateTo.Date,
                CustomerId = filter.CustomerId,
                TotalHours = rows.Sum(x => x.Hours),
                ApprovedHours = rows.Sum(x => x.ApprovedHours),
                WorkedValue = timeEntries.Sum(x => x.ApprovedTime * (x.ProjectRateSnapshot > 0 ? x.ProjectRateSnapshot : x.EmployeeDefaultRateSnapshot)),
                Rows = rows
            };
        }

        private async Task<List<Project>> LoadCustomerReportProjectsAsync(CustomerReportFilter filter)
        {
            if (filter.ProjectId.HasValue)
                return await _projects.Get(x => x.Id == filter.ProjectId.Value && x.PaymentType != ProjectPaymentType.Internal);

            if (filter.CustomerId.HasValue)
                return await _projects.Get(x => x.CustomerId == filter.CustomerId.Value && x.PaymentType != ProjectPaymentType.Internal);

            return await _projects.Get(x => x.PaymentType != ProjectPaymentType.Internal);
        }

        private static CustomerReportDto EmptyCustomerReport(CustomerReportFilter filter)
        {
            return new CustomerReportDto
            {
                DateFrom = filter.DateFrom.Date,
                DateTo = filter.DateTo.Date,
                CustomerId = filter.CustomerId,
                Rows = new List<CustomerReportWorkItemRowDto>()
            };
        }

        private static CustomerReportWorkItemRowDto MapCustomerReportRow(TimeEntry entry, Dictionary<Guid, WorkItem> workItemsById, Dictionary<Guid, Project> projectsById, Dictionary<Guid, Customer> customersById)
        {
            var workItem = workItemsById[entry.WorkItemId];
            var project = projectsById[workItem.ProjectId];
            customersById.TryGetValue(project.CustomerId, out var customer);
            return new CustomerReportWorkItemRowDto
            {
                Date = entry.Date,
                CustomerId = project.CustomerId,
                CustomerName = customer?.CompanyName,
                ProjectId = project.Id,
                ProjectName = project.Name,
                WorkItemId = workItem.Id,
                WorkItemTitle = workItem.Title,
                Hours = entry.Time,
                ApprovedHours = entry.ApprovedTime,
                Description = entry.Description
            };
        }

        private async Task<Project> GetProjectOrThrow(Guid projectId)
        {
            var project = await _projects.GetSingleOrDefaultAsync(x => x.Id == projectId);
            if (project == null)
                throw new ArgumentException("Project not found.");
            return project;
        }

        private async Task<List<TimeEntry>> GetTimeEntriesForWorkItemsAsync(IEnumerable<WorkItem> workItems)
        {
            var workItemIds = workItems.Select(x => x.Id).Distinct().ToList();
            return workItemIds.Any()
                ? await _timeEntries.Get(x => workItemIds.Contains(x.WorkItemId))
                : new List<TimeEntry>();
        }
    }
}
