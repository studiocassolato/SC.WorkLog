#nullable disable

using SC.WorkLog.Application.DTO.Common;
using SC.WorkLog.Application.DTO.ContractPeriods;
using SC.WorkLog.Application.DTO.LeaveRequests;
using SC.WorkLog.Application.DTO.OvertimeRequests;
using SC.WorkLog.Application.DTO.Payments;
using SC.WorkLog.Application.DTO.Projects;
using SC.WorkLog.Application.DTO.Reports;
using SC.WorkLog.Application.DTO.TimeEntries;
using SC.WorkLog.Application.DTO.WorkItems;
using SC.WorkLog.Application.Services;
using SC.WorkLog.Domain.AggregateRoots;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Tests.Application;

public class WorkLogApplicationValidationTests
{
    [Fact]
    public async Task CreateTimeEntryAsync_InitializesApprovedTimeSnapshotsAndOvertime()
    {
        var context = CreateContext();
        var service = CreateTimeEntryService(context);
        var request = new CreateTimeEntryRequest
        {
            EmployeeId = context.Employee.Id,
            WorkItemId = context.WorkItem.Id,
            Date = DateTime.Today,
            Time = 9m,
            Description = "Worked on task"
        };

        await service.CreateTimeEntryAsync(request, EmployeeUser(context.Employee.Id));

        var entry = Assert.Single(context.TimeEntries.Items);
        Assert.Equal(context.Project.Id, entry.ProjectId);
        Assert.Equal(9m, entry.ApprovedTime);
        Assert.Equal(EmployeeLevel.Senior, entry.EmployeeLevelSnapshot);
        Assert.Equal(90m, entry.EmployeeDefaultRateSnapshot);
        Assert.Equal(120m, entry.ProjectRateSnapshot);
        var overtime = Assert.Single(context.OvertimeRequests.Items);
        Assert.Equal(1m, overtime.CalculatedHours);
    }

    [Fact]
    public async Task CreateTimeEntryAsync_StoresProjectIdFromWorkItem()
    {
        var context = CreateContext();
        var otherProject = new Project(context.Customer.Id, "Other project", ProjectPaymentType.TimeAndMaterial, ProjectStatus.Active, null, 60m, 90m, 120m, null, "admin");
        var otherWorkItem = new WorkItem("WL-2", otherProject.Id, "Other task", "Other", context.NewStatus.Key, WorkItemPriority.Normal, context.Employee.Email, "reporter@example.com", WorkItemOrigin.Manual, null, DateTime.Today, false, "admin");
        context.Projects.Items.Add(otherProject);
        context.WorkItems.Items.Add(otherWorkItem);
        var service = CreateTimeEntryService(context);

        await service.CreateTimeEntryAsync(new CreateTimeEntryRequest
        {
            EmployeeId = context.Employee.Id,
            WorkItemId = otherWorkItem.Id,
            Date = DateTime.Today,
            Time = 2m,
            Description = "Worked on other project"
        }, EmployeeUser(context.Employee.Id));

        var entry = Assert.Single(context.TimeEntries.Items);
        Assert.Equal(otherWorkItem.Id, entry.WorkItemId);
        Assert.Equal(otherProject.Id, entry.ProjectId);
    }

    [Fact]
    public async Task UpdateTimeEntryAsync_SyncsProjectIdFromCurrentWorkItem()
    {
        var context = CreateContext();
        var legacyWrongProjectId = Guid.NewGuid();
        var entry = new TimeEntry(context.Employee.Id, context.WorkItem.Id, legacyWrongProjectId, DateTime.Today, 2m, 2m, "Legacy", null, RequestStatus.PendingApproval, null, context.Employee.Level, context.Employee.DefaultHourlyRate, 120m, "employee");
        context.TimeEntries.Items.Add(entry);
        var service = CreateTimeEntryService(context);

        await service.UpdateTimeEntryAsync(new UpdateTimeEntryRequest
        {
            Id = entry.Id,
            Date = DateTime.Today,
            Time = 3m,
            Description = "Updated"
        }, EmployeeUser(context.Employee.Id));

        Assert.Equal(context.Project.Id, entry.ProjectId);
        Assert.Equal(3m, entry.Time);
    }

    [Fact]
    public async Task UpdateApprovedTimeAsync_WithAdmin_UpdatesApprovedTime()
    {
        var context = CreateContext();
        var entry = AddTimeEntry(context, 2m);
        var service = CreateTimeEntryService(context);
        var request = new UpdateApprovedTimeRequest
        {
            Id = entry.Id,
            ApprovedTime = 1m,
            AdminNote = "Approved"
        };

        await service.UpdateApprovedTimeAsync(request, AdminUser());

        Assert.Equal(1m, entry.ApprovedTime);
        Assert.Equal(RequestStatus.Approved, entry.Status);
    }

    [Fact]
    public async Task UpdateApprovedTimeAsync_WithEmployeeUser_ThrowsArgumentException()
    {
        var context = CreateContext();
        var entry = AddTimeEntry(context, 2m);
        var service = CreateTimeEntryService(context);
        var request = new UpdateApprovedTimeRequest
        {
            Id = entry.Id,
            ApprovedTime = 1m,
            AdminNote = "Approved"
        };

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateApprovedTimeAsync(request, EmployeeUser(context.Employee.Id)));

        Assert.Contains("requires Admin role", exception.Message);
    }

    [Fact]
    public async Task CreateTimeEntryAsync_WithAdmin_CanCreateForAnotherEmployee()
    {
        var context = CreateContext();
        var otherEmployee = new Employee("Grace", "Hopper", "grace@example.com", EmployeeLevel.Mid, 80m, 8m, "admin");
        context.Employees.Items.Add(otherEmployee);
        var service = CreateTimeEntryService(context);

        await service.CreateTimeEntryAsync(new CreateTimeEntryRequest
        {
            EmployeeId = otherEmployee.Id,
            WorkItemId = context.WorkItem.Id,
            Date = DateTime.Today,
            Time = 2m,
            Description = "Admin-entered work"
        }, AdminUser());

        var entry = Assert.Single(context.TimeEntries.Items);
        Assert.Equal(otherEmployee.Id, entry.EmployeeId);
        Assert.Equal(EmployeeLevel.Mid, entry.EmployeeLevelSnapshot);
        Assert.Equal(80m, entry.EmployeeDefaultRateSnapshot);
    }

    [Fact]
    public async Task CreateTimeEntryAsync_WithEmployeeForAnotherEmployee_ThrowsArgumentException()
    {
        var context = CreateContext();
        var otherEmployee = new Employee("Grace", "Hopper", "grace@example.com", EmployeeLevel.Mid, 80m, 8m, "admin");
        context.Employees.Items.Add(otherEmployee);
        var service = CreateTimeEntryService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateTimeEntryAsync(new CreateTimeEntryRequest
        {
            EmployeeId = otherEmployee.Id,
            WorkItemId = context.WorkItem.Id,
            Date = DateTime.Today,
            Time = 2m,
            Description = "Invalid work"
        }, EmployeeUser(context.Employee.Id)));

        Assert.Contains("can only be performed by the employee or an Admin", exception.Message);
    }

    [Fact]
    public async Task CreateTimeEntryAsync_WithInactiveEmployee_ThrowsArgumentException()
    {
        var context = CreateContext();
        context.Employee.Update(context.Employee.FirstName, context.Employee.LastName, context.Employee.Email, context.Employee.Level, context.Employee.DefaultHourlyRate, context.Employee.ExpectedDailyHours, false, "admin");
        var service = CreateTimeEntryService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateTimeEntryAsync(new CreateTimeEntryRequest
        {
            EmployeeId = context.Employee.Id,
            WorkItemId = context.WorkItem.Id,
            Date = DateTime.Today,
            Time = 2m,
            Description = "Inactive employee work"
        }, AdminUser()));

        Assert.Contains("Active employee not found", exception.Message);
    }

    [Fact]
    public async Task UpdateTimeEntryAsync_CanChangeWorkItemAndSyncProjectOwnedFields()
    {
        var context = CreateContext();
        var entry = AddTimeEntry(context, 2m);
        var otherProject = new Project(context.Customer.Id, "Other project", ProjectPaymentType.TimeAndMaterial, ProjectStatus.Active, null, 50m, 75m, 150m, null, "admin");
        var otherWorkItem = new WorkItem("WL-2", otherProject.Id, "Other task", "Other", context.NewStatus.Key, WorkItemPriority.Normal, context.Employee.Email, "reporter@example.com", WorkItemOrigin.Manual, null, DateTime.Today, false, "admin");
        context.Projects.Items.Add(otherProject);
        context.WorkItems.Items.Add(otherWorkItem);
        var service = CreateTimeEntryService(context);

        await service.UpdateTimeEntryAsync(new UpdateTimeEntryRequest
        {
            Id = entry.Id,
            WorkItemId = otherWorkItem.Id,
            Date = DateTime.Today,
            Time = 3m,
            Description = "Moved work item"
        }, EmployeeUser(context.Employee.Id));

        Assert.Equal(otherWorkItem.Id, entry.WorkItemId);
        Assert.Equal(otherProject.Id, entry.ProjectId);
        Assert.Equal(150m, entry.ProjectRateSnapshot);
        Assert.Equal(3m, entry.Time);
    }

    [Fact]
    public async Task UpdateApprovedTimeAsync_AllowsZeroApprovedTime()
    {
        var context = CreateContext();
        var entry = AddTimeEntry(context, 2m);
        var service = CreateTimeEntryService(context);

        await service.UpdateApprovedTimeAsync(new UpdateApprovedTimeRequest
        {
            Id = entry.Id,
            ApprovedTime = 0m,
            AdminNote = "Not billable"
        }, AdminUser());

        Assert.Equal(0m, entry.ApprovedTime);
        Assert.Equal(RequestStatus.Approved, entry.Status);
    }

    [Fact]
    public async Task GetTimeEntriesAsync_FiltersByCustomerAndStatus()
    {
        var context = CreateContext();
        var approved = AddTimeEntry(context, 2m);
        approved.Approve(2m, null, "admin");
        AddUnrelatedProjectWithTimeEntry(context, 5m);
        var service = CreateTimeEntryService(context);

        var rows = await service.GetTimeEntriesAsync(new TimeEntryFilter
        {
            CustomerId = context.Customer.Id,
            Status = RequestStatus.Approved
        }, AdminUser());

        var row = Assert.Single(rows);
        Assert.Equal(approved.Id, row.Id);
        Assert.Equal(context.WorkItem.Code, row.WorkItemCode);
    }

    [Fact]
    public async Task GetTimeEntriesAsync_WithEmployeeUser_ScopesToCurrentEmployeeAndHidesSensitiveFields()
    {
        var context = CreateContext();
        var ownEntry = AddTimeEntry(context, 2m);
        ownEntry.Approve(1m, "Internal adjustment", "admin");
        var otherEmployee = new Employee("Grace", "Hopper", "grace@example.com", EmployeeLevel.Mid, 80m, 8m, "admin");
        context.Employees.Items.Add(otherEmployee);
        context.TimeEntries.Items.Add(new TimeEntry(otherEmployee.Id, context.WorkItem.Id, context.Project.Id, DateTime.Today, 5m, 5m, "Other", null, RequestStatus.PendingApproval, null, EmployeeLevel.Mid, 80m, 90m, "admin"));
        var service = CreateTimeEntryService(context);

        var rows = await service.GetTimeEntriesAsync(new TimeEntryFilter(), EmployeeUser(context.Employee.Id));

        var row = Assert.Single(rows);
        Assert.Equal(ownEntry.Id, row.Id);
        Assert.Null(row.ApprovedTime);
        Assert.Null(row.AdminNote);
        Assert.Null(row.EmployeeLevelSnapshot);
        Assert.Null(row.EmployeeDefaultRateSnapshot);
        Assert.Null(row.ProjectRateSnapshot);
        Assert.Null(row.CalculatedValue);
    }

    [Fact]
    public async Task GetTimeEntriesAsync_WithAdmin_CanListAllEmployeesAndSeeSensitiveFields()
    {
        var context = CreateContext();
        var ownEntry = AddTimeEntry(context, 2m);
        var otherEmployee = new Employee("Grace", "Hopper", "grace@example.com", EmployeeLevel.Mid, 80m, 8m, "admin");
        context.Employees.Items.Add(otherEmployee);
        context.TimeEntries.Items.Add(new TimeEntry(otherEmployee.Id, context.WorkItem.Id, context.Project.Id, DateTime.Today, 5m, 5m, "Other", null, RequestStatus.PendingApproval, null, EmployeeLevel.Mid, 80m, 90m, "admin"));
        var service = CreateTimeEntryService(context);

        var rows = await service.GetTimeEntriesAsync(new TimeEntryFilter(), AdminUser());

        Assert.Equal(2, rows.Count);
        var row = Assert.Single(rows, x => x.Id == ownEntry.Id);
        Assert.Equal(ownEntry.ApprovedTime, row.ApprovedTime);
        Assert.Equal(context.Employee.Level, row.EmployeeLevelSnapshot);
        Assert.Equal(context.Employee.DefaultHourlyRate, row.EmployeeDefaultRateSnapshot);
        Assert.Equal(ownEntry.ProjectRateSnapshot, row.ProjectRateSnapshot);
        Assert.NotNull(row.CalculatedValue);
    }

    [Fact]
    public async Task UpdateTimeEntryAsync_WithEmployeeForAnotherEmployee_ThrowsArgumentException()
    {
        var context = CreateContext();
        var otherEmployee = new Employee("Grace", "Hopper", "grace@example.com", EmployeeLevel.Mid, 80m, 8m, "admin");
        context.Employees.Items.Add(otherEmployee);
        var otherEntry = new TimeEntry(otherEmployee.Id, context.WorkItem.Id, context.Project.Id, DateTime.Today, 5m, 5m, "Other", null, RequestStatus.PendingApproval, null, EmployeeLevel.Mid, 80m, 90m, "admin");
        context.TimeEntries.Items.Add(otherEntry);
        var service = CreateTimeEntryService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateTimeEntryAsync(new UpdateTimeEntryRequest
        {
            Id = otherEntry.Id,
            WorkItemId = context.WorkItem.Id,
            Date = DateTime.Today,
            Time = 4m,
            Description = "Invalid update"
        }, EmployeeUser(context.Employee.Id)));

        Assert.Contains("can only be performed by the employee or an Admin", exception.Message);
    }

    [Fact]
    public async Task ProjectReportService_TimeAndMaterial_UsesRepositoriesAndCalculator()
    {
        var context = CreateContext();
        AddTimeEntry(context, 2m, 2m);
        context.ProjectPayments.Items.Add(new ProjectPayment(context.Project.Id, DateTime.Today, 100m, "Payment", "admin"));
        var service = CreateProjectReportService(context);

        var economics = await service.GetProjectEconomicsAsync(context.Project.Id, AdminUser());

        Assert.Equal(240m, economics.TimeAndMaterial.WorkedValue);
        Assert.Equal(-140m, economics.TimeAndMaterial.CurrentBalance);
    }

    [Fact]
    public async Task ProjectReportService_TimeAndMaterial_UsesTimeEntryProjectId()
    {
        var context = CreateContext();
        AddTimeEntry(context, 2m, 2m);
        var otherProjectId = Guid.NewGuid();
        context.TimeEntries.Items.Add(new TimeEntry(context.Employee.Id, context.WorkItem.Id, otherProjectId, DateTime.Today, 10m, 10m, "Wrong project", null, RequestStatus.PendingApproval, null, context.Employee.Level, context.Employee.DefaultHourlyRate, 120m, "employee"));
        var service = CreateProjectReportService(context);

        var economics = await service.GetProjectEconomicsAsync(context.Project.Id, AdminUser());

        Assert.Equal(2m, economics.TimeAndMaterial.ApprovedHours);
        Assert.Equal(240m, economics.TimeAndMaterial.WorkedValue);
    }

    [Fact]
    public async Task ProjectReportService_FixedPrice_UsesRepositoriesAndCalculator()
    {
        var context = CreateContext(ProjectPaymentType.FixedPrice);
        AddTimeEntry(context, 2m, 2m, 0m);
        var service = CreateProjectReportService(context);

        var economics = await service.GetProjectEconomicsAsync(context.Project.Id, AdminUser());

        Assert.Equal(10000m, economics.FixedPrice.FixedAmount);
        Assert.Equal(180m, economics.FixedPrice.InternalValueUsed);
    }

    [Fact]
    public async Task ProjectReportService_AnnualRetainer_AssignsTimeEntriesByDate()
    {
        var context = CreateContext(ProjectPaymentType.AnnualRetainer);
        var period2026 = new ProjectContractPeriod(context.Project.Id, new DateTime(2026, 1, 1), new DateTime(2026, 12, 31), 12000m, null, "2026", "admin");
        var period2027 = new ProjectContractPeriod(context.Project.Id, new DateTime(2027, 1, 1), new DateTime(2027, 12, 31), 12000m, null, "2027", "admin");
        context.ContractPeriods.Items.Add(period2026);
        context.ContractPeriods.Items.Add(period2027);
        AddTimeEntry(context, 3m, 3m, 0m, new DateTime(2027, 2, 1));
        var service = CreateProjectReportService(context);

        var economics = await service.GetProjectEconomicsAsync(context.Project.Id, AdminUser());

        Assert.Equal(0m, economics.AnnualRetainerPeriods.Single(x => x.ContractPeriodId == period2026.Id).InternalValueUsed);
        Assert.Equal(270m, economics.AnnualRetainerPeriods.Single(x => x.ContractPeriodId == period2027.Id).InternalValueUsed);
    }

    [Fact]
    public async Task ProjectReportService_AnnualRetainerWithoutContractPeriods_ReturnsEmptyPeriods()
    {
        var context = CreateContext(ProjectPaymentType.AnnualRetainer);
        var service = CreateProjectReportService(context);

        var economics = await service.GetProjectEconomicsAsync(context.Project.Id, AdminUser());

        Assert.Empty(economics.AnnualRetainerPeriods);
        Assert.Null(economics.AnnualRetainer);
    }

    [Fact]
    public async Task ProjectReportService_InternalProject_ReturnsInternalEconomics()
    {
        var context = CreateContext(ProjectPaymentType.Internal);
        AddTimeEntry(context, 2m, 2m, 0m);
        var service = CreateProjectReportService(context);

        var economics = await service.GetProjectEconomicsAsync(context.Project.Id, AdminUser());

        Assert.Equal(2m, economics.Internal.ApprovedHours);
        Assert.Equal(180m, economics.Internal.InternalValue);
        var byEmployee = Assert.Single(economics.Internal.InternalValueByEmployee);
        Assert.Equal(context.Employee.Id, byEmployee.EmployeeId);
        Assert.Equal(180m, byEmployee.InternalValue);
    }

    [Fact]
    public async Task ProjectReportService_WithEmployeeRole_RejectsEconomics()
    {
        var context = CreateContext();
        var service = CreateProjectReportService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.GetProjectEconomicsAsync(context.Project.Id, EmployeeUser(context.Employee.Id)));

        Assert.Contains("requires Admin role", exception.Message);
    }

    [Fact]
    public async Task CreateProjectContractPeriodAsync_WithOverlappingPeriod_ThrowsArgumentException()
    {
        var context = CreateContext(ProjectPaymentType.AnnualRetainer);
        context.ContractPeriods.Items.Add(new ProjectContractPeriod(context.Project.Id, new DateTime(2026, 1, 1), new DateTime(2026, 12, 31), 12000m, null, "FY26", "admin"));
        var service = CreateProjectService(context);
        var request = new CreateProjectContractPeriodRequest
        {
            ProjectId = context.Project.Id,
            StartDate = new DateTime(2026, 6, 1),
            EndDate = new DateTime(2027, 5, 31),
            Amount = 12000m,
            Note = "Overlap"
        };

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateProjectContractPeriodAsync(request, AdminUser()));

        Assert.Contains("cannot overlap", exception.Message);
    }

    [Fact]
    public async Task CreateProjectContractPeriodAsync_WithEmployeeUser_ThrowsArgumentException()
    {
        var context = CreateContext(ProjectPaymentType.AnnualRetainer);
        var service = CreateProjectService(context);
        var request = new CreateProjectContractPeriodRequest
        {
            ProjectId = context.Project.Id,
            StartDate = new DateTime(2026, 1, 1),
            EndDate = new DateTime(2026, 12, 31),
            Amount = 12000m
        };

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateProjectContractPeriodAsync(request, EmployeeUser(context.Employee.Id)));

        Assert.Contains("requires Admin role", exception.Message);
    }

    [Fact]
    public async Task GetProjectContractPeriodsAsync_WithEmployeeUser_ThrowsArgumentException()
    {
        var context = CreateContext(ProjectPaymentType.AnnualRetainer);
        var service = CreateProjectService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.GetProjectContractPeriodsAsync(context.Project.Id, EmployeeUser(context.Employee.Id)));

        Assert.Contains("requires Admin role", exception.Message);
    }

    [Fact]
    public async Task UpdateProjectContractPeriodAsync_WithEmployeeUser_ThrowsArgumentException()
    {
        var context = CreateContext(ProjectPaymentType.AnnualRetainer);
        var period = new ProjectContractPeriod(context.Project.Id, new DateTime(2026, 1, 1), new DateTime(2026, 12, 31), 12000m, null, "FY26", "admin");
        context.ContractPeriods.Items.Add(period);
        var service = CreateProjectService(context);
        var request = new UpdateProjectContractPeriodRequest
        {
            Id = period.Id,
            ProjectId = context.Project.Id,
            StartDate = new DateTime(2026, 1, 1),
            EndDate = new DateTime(2026, 12, 31),
            Amount = 13000m
        };

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateProjectContractPeriodAsync(request, EmployeeUser(context.Employee.Id)));

        Assert.Contains("requires Admin role", exception.Message);
    }

    [Fact]
    public async Task CreateProjectContractPeriodAsync_ForNonAnnualRetainerProject_ThrowsArgumentException()
    {
        var context = CreateContext(ProjectPaymentType.TimeAndMaterial);
        var service = CreateProjectService(context);
        var request = new CreateProjectContractPeriodRequest
        {
            ProjectId = context.Project.Id,
            StartDate = new DateTime(2026, 1, 1),
            EndDate = new DateTime(2026, 12, 31),
            Amount = 12000m
        };

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateProjectContractPeriodAsync(request, AdminUser()));

        Assert.Contains("Annual retainer", exception.Message);
    }

    [Fact]
    public async Task CreateProjectContractPeriodAsync_WithNonPositiveAmount_ThrowsArgumentException()
    {
        var context = CreateContext(ProjectPaymentType.AnnualRetainer);
        var service = CreateProjectService(context);
        var request = new CreateProjectContractPeriodRequest
        {
            ProjectId = context.Project.Id,
            StartDate = new DateTime(2026, 1, 1),
            EndDate = new DateTime(2026, 12, 31),
            Amount = 0m
        };

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateProjectContractPeriodAsync(request, AdminUser()));

        Assert.Contains("Amount", exception.Message);
    }

    [Fact]
    public async Task CreateProjectContractPeriodAsync_WithEndDateBeforeStartDate_ThrowsArgumentException()
    {
        var context = CreateContext(ProjectPaymentType.AnnualRetainer);
        var service = CreateProjectService(context);
        var request = new CreateProjectContractPeriodRequest
        {
            ProjectId = context.Project.Id,
            StartDate = new DateTime(2026, 12, 31),
            EndDate = new DateTime(2026, 1, 1),
            Amount = 12000m
        };

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateProjectContractPeriodAsync(request, AdminUser()));

        Assert.Contains("EndDate", exception.Message);
    }

    [Fact]
    public async Task ProjectEconomics_ReflectsCreatedContractPeriod()
    {
        var context = CreateContext(ProjectPaymentType.AnnualRetainer);
        AddTimeEntry(context, 2m, 2m, date: new DateTime(2026, 1, 10));
        var projectService = CreateProjectService(context);
        var reportService = CreateProjectReportService(context);

        var period = await projectService.CreateProjectContractPeriodAsync(new CreateProjectContractPeriodRequest
        {
            ProjectId = context.Project.Id,
            StartDate = new DateTime(2026, 1, 1),
            EndDate = new DateTime(2026, 12, 31),
            Amount = 12000m,
            Note = "FY26"
        }, AdminUser());

        var economics = await reportService.GetProjectEconomicsAsync(context.Project.Id, AdminUser());
        var periodEconomics = Assert.Single(economics.AnnualRetainerPeriods);

        Assert.Equal(period.Id, periodEconomics.ContractPeriodId);
        Assert.Equal(180m, periodEconomics.InternalValueUsed);
        Assert.Equal(11820m, periodEconomics.Balance);
    }

    [Fact]
    public async Task DeleteProjectContractPeriodAsync_WithEmployeeUser_ThrowsArgumentException()
    {
        var context = CreateContext(ProjectPaymentType.AnnualRetainer);
        var period = new ProjectContractPeriod(context.Project.Id, new DateTime(2026, 1, 1), new DateTime(2026, 12, 31), 12000m, null, "FY26", "admin");
        context.ContractPeriods.Items.Add(period);
        var service = CreateProjectService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.DeleteProjectContractPeriodAsync(new DeleteProjectContractPeriodRequest
        {
            ProjectId = context.Project.Id,
            ContractPeriodId = period.Id
        }, EmployeeUser(context.Employee.Id)));

        Assert.Contains("requires Admin role", exception.Message);
    }

    [Fact]
    public async Task DeleteProjectContractPeriodAsync_ForNonAnnualRetainerProject_ThrowsArgumentException()
    {
        var context = CreateContext(ProjectPaymentType.TimeAndMaterial);
        var period = new ProjectContractPeriod(context.Project.Id, new DateTime(2026, 1, 1), new DateTime(2026, 12, 31), 12000m, null, "FY26", "admin");
        context.ContractPeriods.Items.Add(period);
        var service = CreateProjectService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.DeleteProjectContractPeriodAsync(new DeleteProjectContractPeriodRequest
        {
            ProjectId = context.Project.Id,
            ContractPeriodId = period.Id
        }, AdminUser()));

        Assert.Contains("Annual retainer", exception.Message);
    }

    [Fact]
    public async Task DeleteProjectContractPeriodAsync_WithMissingPeriod_ThrowsArgumentException()
    {
        var context = CreateContext(ProjectPaymentType.AnnualRetainer);
        var service = CreateProjectService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.DeleteProjectContractPeriodAsync(new DeleteProjectContractPeriodRequest
        {
            ProjectId = context.Project.Id,
            ContractPeriodId = Guid.NewGuid()
        }, AdminUser()));

        Assert.Contains("not found", exception.Message);
    }

    [Fact]
    public async Task DeleteProjectContractPeriodAsync_FromAnotherProject_ThrowsArgumentException()
    {
        var context = CreateContext(ProjectPaymentType.AnnualRetainer);
        var otherProject = new Project(context.Customer.Id, "Other annual retainer", ProjectPaymentType.AnnualRetainer, ProjectStatus.Active, null, null, null, null, null, "admin");
        context.Projects.Items.Add(otherProject);
        var period = new ProjectContractPeriod(otherProject.Id, new DateTime(2026, 1, 1), new DateTime(2026, 12, 31), 12000m, null, "FY26", "admin");
        context.ContractPeriods.Items.Add(period);
        var service = CreateProjectService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.DeleteProjectContractPeriodAsync(new DeleteProjectContractPeriodRequest
        {
            ProjectId = context.Project.Id,
            ContractPeriodId = period.Id
        }, AdminUser()));

        Assert.Contains("does not belong", exception.Message);
    }

    [Fact]
    public async Task ProjectEconomics_ReflectsDeletedContractPeriod()
    {
        var context = CreateContext(ProjectPaymentType.AnnualRetainer);
        AddTimeEntry(context, 2m, 2m, date: new DateTime(2026, 1, 10));
        var period = new ProjectContractPeriod(context.Project.Id, new DateTime(2026, 1, 1), new DateTime(2026, 12, 31), 12000m, null, "FY26", "admin");
        context.ContractPeriods.Items.Add(period);
        var projectService = CreateProjectService(context);
        var reportService = CreateProjectReportService(context);

        await projectService.DeleteProjectContractPeriodAsync(new DeleteProjectContractPeriodRequest
        {
            ProjectId = context.Project.Id,
            ContractPeriodId = period.Id
        }, AdminUser());

        var economics = await reportService.GetProjectEconomicsAsync(context.Project.Id, AdminUser());

        Assert.Empty(economics.AnnualRetainerPeriods);
    }

    [Fact]
    public async Task CreateProjectPaymentAsync_WithEmployeeUser_ThrowsArgumentException()
    {
        var context = CreateContext();
        var service = CreateProjectService(context);
        var request = new CreateProjectPaymentRequest
        {
            ProjectId = context.Project.Id,
            PaymentDate = DateTime.Today,
            Amount = 100m
        };

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateProjectPaymentAsync(request, EmployeeUser(context.Employee.Id)));

        Assert.Contains("requires Admin role", exception.Message);
    }

    [Fact]
    public async Task GetProjectPaymentsAsync_WithEmployeeUser_ThrowsArgumentException()
    {
        var context = CreateContext();
        var service = CreateProjectService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.GetProjectPaymentsAsync(context.Project.Id, EmployeeUser(context.Employee.Id)));

        Assert.Contains("requires Admin role", exception.Message);
    }

    [Fact]
    public async Task UpdateProjectPaymentAsync_WithEmployeeUser_ThrowsArgumentException()
    {
        var context = CreateContext();
        var payment = new ProjectPayment(context.Project.Id, DateTime.Today, 100m, "Payment", "admin");
        context.ProjectPayments.Items.Add(payment);
        var service = CreateProjectService(context);
        var request = new UpdateProjectPaymentRequest
        {
            Id = payment.Id,
            ProjectId = context.Project.Id,
            PaymentDate = DateTime.Today,
            Amount = 150m
        };

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateProjectPaymentAsync(request, EmployeeUser(context.Employee.Id)));

        Assert.Contains("requires Admin role", exception.Message);
    }

    [Fact]
    public async Task CreateProjectPaymentAsync_ForNonTimeAndMaterialProject_ThrowsArgumentException()
    {
        var context = CreateContext(ProjectPaymentType.FixedPrice);
        var service = CreateProjectService(context);
        var request = new CreateProjectPaymentRequest
        {
            ProjectId = context.Project.Id,
            PaymentDate = DateTime.Today,
            Amount = 100m
        };

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateProjectPaymentAsync(request, AdminUser()));

        Assert.Contains("Time & material", exception.Message);
    }

    [Fact]
    public async Task CreateProjectPaymentAsync_WithNonPositiveAmount_ThrowsArgumentException()
    {
        var context = CreateContext();
        var service = CreateProjectService(context);
        var request = new CreateProjectPaymentRequest
        {
            ProjectId = context.Project.Id,
            PaymentDate = DateTime.Today,
            Amount = 0m
        };

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateProjectPaymentAsync(request, AdminUser()));

        Assert.Contains("Amount", exception.Message);
    }

    [Fact]
    public async Task ProjectEconomics_ReflectsCreatedProjectPayment()
    {
        var context = CreateContext();
        AddTimeEntry(context, 2m, 2m);
        var projectService = CreateProjectService(context);
        var reportService = CreateProjectReportService(context);

        await projectService.CreateProjectPaymentAsync(new CreateProjectPaymentRequest
        {
            ProjectId = context.Project.Id,
            PaymentDate = DateTime.Today,
            Amount = 300m,
            Note = "Advance"
        }, AdminUser());

        var economics = await reportService.GetProjectEconomicsAsync(context.Project.Id, AdminUser());

        Assert.Equal(300m, economics.TimeAndMaterial.TotalPaymentsReceived);
        Assert.Equal(60m, economics.TimeAndMaterial.CurrentBalance);
    }

    [Fact]
    public async Task DeleteProjectPaymentAsync_WithEmployeeUser_ThrowsArgumentException()
    {
        var context = CreateContext();
        var payment = new ProjectPayment(context.Project.Id, DateTime.Today, 100m, "Payment", "admin");
        context.ProjectPayments.Items.Add(payment);
        var service = CreateProjectService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.DeleteProjectPaymentAsync(new DeleteProjectPaymentRequest
        {
            ProjectId = context.Project.Id,
            PaymentId = payment.Id
        }, EmployeeUser(context.Employee.Id)));

        Assert.Contains("requires Admin role", exception.Message);
    }

    [Fact]
    public async Task DeleteProjectPaymentAsync_ForNonTimeAndMaterialProject_ThrowsArgumentException()
    {
        var context = CreateContext(ProjectPaymentType.FixedPrice);
        var payment = new ProjectPayment(context.Project.Id, DateTime.Today, 100m, "Payment", "admin");
        context.ProjectPayments.Items.Add(payment);
        var service = CreateProjectService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.DeleteProjectPaymentAsync(new DeleteProjectPaymentRequest
        {
            ProjectId = context.Project.Id,
            PaymentId = payment.Id
        }, AdminUser()));

        Assert.Contains("Time & material", exception.Message);
    }

    [Fact]
    public async Task DeleteProjectPaymentAsync_WithMissingPayment_ThrowsArgumentException()
    {
        var context = CreateContext();
        var service = CreateProjectService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.DeleteProjectPaymentAsync(new DeleteProjectPaymentRequest
        {
            ProjectId = context.Project.Id,
            PaymentId = Guid.NewGuid()
        }, AdminUser()));

        Assert.Contains("not found", exception.Message);
    }

    [Fact]
    public async Task DeleteProjectPaymentAsync_FromAnotherProject_ThrowsArgumentException()
    {
        var context = CreateContext();
        var otherProject = new Project(context.Customer.Id, "Other project", ProjectPaymentType.TimeAndMaterial, ProjectStatus.Active, null, 60m, 90m, 120m, null, "admin");
        context.Projects.Items.Add(otherProject);
        var payment = new ProjectPayment(otherProject.Id, DateTime.Today, 100m, "Payment", "admin");
        context.ProjectPayments.Items.Add(payment);
        var service = CreateProjectService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.DeleteProjectPaymentAsync(new DeleteProjectPaymentRequest
        {
            ProjectId = context.Project.Id,
            PaymentId = payment.Id
        }, AdminUser()));

        Assert.Contains("does not belong", exception.Message);
    }

    [Fact]
    public async Task ProjectEconomics_ReflectsDeletedProjectPayment()
    {
        var context = CreateContext();
        AddTimeEntry(context, 2m, 2m);
        var payment = new ProjectPayment(context.Project.Id, DateTime.Today, 300m, "Payment", "admin");
        context.ProjectPayments.Items.Add(payment);
        var projectService = CreateProjectService(context);
        var reportService = CreateProjectReportService(context);

        await projectService.DeleteProjectPaymentAsync(new DeleteProjectPaymentRequest
        {
            ProjectId = context.Project.Id,
            PaymentId = payment.Id
        }, AdminUser());

        var economics = await reportService.GetProjectEconomicsAsync(context.Project.Id, AdminUser());

        Assert.Equal(0m, economics.TimeAndMaterial.TotalPaymentsReceived);
        Assert.Equal(-240m, economics.TimeAndMaterial.CurrentBalance);
    }

    [Fact]
    public async Task CreateProjectMilestoneAsync_WithEmployeeUser_ThrowsArgumentException()
    {
        var context = CreateContext();
        var service = CreateProjectService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateProjectMilestoneAsync(new ProjectMilestoneDto
        {
            ProjectId = context.Project.Id,
            Title = "Kickoff",
            Date = DateTime.Today
        }, EmployeeUser(context.Employee.Id)));

        Assert.Contains("requires Admin role", exception.Message);
    }

    [Fact]
    public async Task UpdateProjectMilestoneAsync_WithEmployeeUser_ThrowsArgumentException()
    {
        var context = CreateContext();
        var milestone = new ProjectMilestone(context.Project.Id, "Kickoff", DateTime.Today, "admin");
        context.ProjectMilestones.Items.Add(milestone);
        var service = CreateProjectService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateProjectMilestoneAsync(new ProjectMilestoneDto
        {
            Id = milestone.Id,
            ProjectId = context.Project.Id,
            Title = "Updated",
            Date = DateTime.Today
        }, EmployeeUser(context.Employee.Id)));

        Assert.Contains("requires Admin role", exception.Message);
    }

    [Fact]
    public async Task DeleteProjectMilestoneAsync_WithEmployeeUser_ThrowsArgumentException()
    {
        var context = CreateContext();
        var milestone = new ProjectMilestone(context.Project.Id, "Kickoff", DateTime.Today, "admin");
        context.ProjectMilestones.Items.Add(milestone);
        var service = CreateProjectService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.DeleteProjectMilestoneAsync(new ProjectMilestoneDto
        {
            Id = milestone.Id,
            ProjectId = context.Project.Id
        }, EmployeeUser(context.Employee.Id)));

        Assert.Contains("requires Admin role", exception.Message);
    }

    [Fact]
    public async Task UpdateProjectMilestoneAsync_FromAnotherProject_ThrowsArgumentException()
    {
        var context = CreateContext();
        var otherProject = new Project(context.Customer.Id, "Other project", ProjectPaymentType.TimeAndMaterial, ProjectStatus.Active, null, 60m, 90m, 120m, null, "admin");
        context.Projects.Items.Add(otherProject);
        var milestone = new ProjectMilestone(otherProject.Id, "Kickoff", DateTime.Today, "admin");
        context.ProjectMilestones.Items.Add(milestone);
        var service = CreateProjectService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateProjectMilestoneAsync(new ProjectMilestoneDto
        {
            Id = milestone.Id,
            ProjectId = context.Project.Id,
            Title = "Updated",
            Date = DateTime.Today
        }, AdminUser()));

        Assert.Contains("does not belong", exception.Message);
    }

    [Fact]
    public async Task CreateProjectMilestoneAsync_WithoutTitle_ThrowsArgumentException()
    {
        var context = CreateContext();
        var service = CreateProjectService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateProjectMilestoneAsync(new ProjectMilestoneDto
        {
            ProjectId = context.Project.Id,
            Title = "",
            Date = DateTime.Today
        }, AdminUser()));

        Assert.Contains("Title", exception.Message);
    }

    [Fact]
    public async Task CreateProjectMilestoneAsync_WithoutDate_ThrowsArgumentException()
    {
        var context = CreateContext();
        var service = CreateProjectService(context);

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateProjectMilestoneAsync(new ProjectMilestoneDto
        {
            ProjectId = context.Project.Id,
            Title = "Kickoff",
            Date = default
        }, AdminUser()));

        Assert.Contains("Date", exception.Message);
    }

    [Fact]
    public async Task LeaveApproval_IsAdminOnly_AndApprovedLeaveContributesToCompleteness()
    {
        var context = CreateContext();
        var leave = new LeaveRequest(context.Employee.Id, LeaveRequestType.Vacation, DateTime.Today, 8m, "Vacation", "employee");
        context.LeaveRequests.Items.Add(leave);
        var leaveService = new LeaveRequestService(context.LeaveRequests, context.Employees);

        await Assert.ThrowsAsync<ArgumentException>(() => leaveService.ApproveLeaveRequestAsync(new ApproveLeaveRequestRequest { Id = leave.Id }, EmployeeUser(context.Employee.Id)));
        await leaveService.ApproveLeaveRequestAsync(new ApproveLeaveRequestRequest { Id = leave.Id }, AdminUser());

        var completeness = await CreateTimeCompletenessService(context).GetTimeCompletenessAsync(new TimeCompletenessFilter { DateFrom = DateTime.Today, DateTo = DateTime.Today }, AdminUser());
        Assert.Equal(8m, Assert.Single(completeness.Rows).LeaveHours);
    }

    [Fact]
    public async Task CreateLeaveRequestAsync_WithEmployee_CreatesOnlyOwnRequest()
    {
        var context = CreateContext();
        var service = new LeaveRequestService(context.LeaveRequests, context.Employees);

        var created = await service.CreateLeaveRequestAsync(new CreateLeaveRequestRequest
        {
            EmployeeId = context.Employee.Id,
            Type = LeaveRequestType.Vacation,
            Date = DateTime.Today,
            Hours = 8m,
            EmployeeNote = "Vacation"
        }, EmployeeUser(context.Employee.Id));

        Assert.Equal(context.Employee.Id, created.EmployeeId);
        Assert.Equal(RequestStatus.PendingApproval, created.Status);
        Assert.Single(context.LeaveRequests.Items);
    }

    [Fact]
    public async Task CreateLeaveRequestAsync_WithEmployeeForAnotherEmployee_ThrowsArgumentException()
    {
        var context = CreateContext();
        var otherEmployee = new Employee("Grace", "Hopper", "grace@example.com", EmployeeLevel.Senior, 90m, 8m, "admin");
        context.Employees.Items.Add(otherEmployee);
        var service = new LeaveRequestService(context.LeaveRequests, context.Employees);

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateLeaveRequestAsync(new CreateLeaveRequestRequest
        {
            EmployeeId = otherEmployee.Id,
            Type = LeaveRequestType.Permission,
            Date = DateTime.Today,
            Hours = 2m
        }, EmployeeUser(context.Employee.Id)));
    }

    [Fact]
    public async Task CreateLeaveRequestAsync_WithAdmin_CanCreateForAnotherActiveEmployee()
    {
        var context = CreateContext();
        var otherEmployee = new Employee("Grace", "Hopper", "grace@example.com", EmployeeLevel.Senior, 90m, 8m, "admin");
        context.Employees.Items.Add(otherEmployee);
        var service = new LeaveRequestService(context.LeaveRequests, context.Employees);

        var created = await service.CreateLeaveRequestAsync(new CreateLeaveRequestRequest
        {
            EmployeeId = otherEmployee.Id,
            Type = LeaveRequestType.Permission,
            Date = DateTime.Today,
            Hours = 2m
        }, AdminUser());

        Assert.Equal(otherEmployee.Id, created.EmployeeId);
    }

    [Fact]
    public async Task CreateLeaveRequestAsync_RejectsMissingInactiveInvalidHoursAndMissingDate()
    {
        var context = CreateContext();
        var inactiveEmployee = new Employee("Inactive", "Employee", "inactive@example.com", EmployeeLevel.Junior, 60m, 8m, "admin");
        inactiveEmployee.Update("Inactive", "Employee", "inactive@example.com", EmployeeLevel.Junior, 60m, 8m, false, "admin");
        context.Employees.Items.Add(inactiveEmployee);
        var service = new LeaveRequestService(context.LeaveRequests, context.Employees);

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateLeaveRequestAsync(new CreateLeaveRequestRequest
        {
            EmployeeId = Guid.NewGuid(),
            Type = LeaveRequestType.Vacation,
            Date = DateTime.Today,
            Hours = 8m
        }, AdminUser()));
        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateLeaveRequestAsync(new CreateLeaveRequestRequest
        {
            EmployeeId = inactiveEmployee.Id,
            Type = LeaveRequestType.Vacation,
            Date = DateTime.Today,
            Hours = 8m
        }, AdminUser()));
        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateLeaveRequestAsync(new CreateLeaveRequestRequest
        {
            EmployeeId = context.Employee.Id,
            Type = LeaveRequestType.Vacation,
            Date = DateTime.Today,
            Hours = 0m
        }, EmployeeUser(context.Employee.Id)));
        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateLeaveRequestAsync(new CreateLeaveRequestRequest
        {
            EmployeeId = context.Employee.Id,
            Type = LeaveRequestType.Vacation,
            Date = DateTime.Today,
            Hours = 1.25m
        }, EmployeeUser(context.Employee.Id)));
        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateLeaveRequestAsync(new CreateLeaveRequestRequest
        {
            EmployeeId = context.Employee.Id,
            Type = LeaveRequestType.Vacation,
            Date = default,
            Hours = 8m
        }, EmployeeUser(context.Employee.Id)));
    }

    [Fact]
    public async Task RejectLeaveRequestAsync_IsAdminOnly_AndRejectedLeaveDoesNotContributeToCompleteness()
    {
        var context = CreateContext();
        var leave = new LeaveRequest(context.Employee.Id, LeaveRequestType.Vacation, DateTime.Today, 8m, "Vacation", "employee");
        context.LeaveRequests.Items.Add(leave);
        var leaveService = new LeaveRequestService(context.LeaveRequests, context.Employees);

        await Assert.ThrowsAsync<ArgumentException>(() => leaveService.RejectLeaveRequestAsync(new RejectLeaveRequestRequest { Id = leave.Id }, EmployeeUser(context.Employee.Id)));
        await leaveService.RejectLeaveRequestAsync(new RejectLeaveRequestRequest { Id = leave.Id, AdminNote = "Rejected" }, AdminUser());

        var completeness = await CreateTimeCompletenessService(context).GetTimeCompletenessAsync(new TimeCompletenessFilter { DateFrom = DateTime.Today, DateTo = DateTime.Today }, AdminUser());
        Assert.Equal(0m, Assert.Single(completeness.Rows).LeaveHours);
    }

    [Fact]
    public async Task TimeCompletenessService_CountsApprovedLeaveOnly()
    {
        var context = CreateContext();
        var approvedLeave = new LeaveRequest(context.Employee.Id, LeaveRequestType.Vacation, DateTime.Today, 4m, "Approved", "employee");
        approvedLeave.Approve("Approved", "admin");
        var pendingLeave = new LeaveRequest(context.Employee.Id, LeaveRequestType.Permission, DateTime.Today, 2m, "Pending", "employee");
        var rejectedLeave = new LeaveRequest(context.Employee.Id, LeaveRequestType.Permission, DateTime.Today, 1m, "Rejected", "employee");
        rejectedLeave.Reject("Rejected", "admin");
        context.LeaveRequests.Items.Add(approvedLeave);
        context.LeaveRequests.Items.Add(pendingLeave);
        context.LeaveRequests.Items.Add(rejectedLeave);

        var completeness = await CreateTimeCompletenessService(context).GetTimeCompletenessAsync(new TimeCompletenessFilter { DateFrom = DateTime.Today, DateTo = DateTime.Today }, AdminUser());

        Assert.Equal(4m, Assert.Single(completeness.Rows).LeaveHours);
    }

    [Fact]
    public async Task GetLeaveRequestsAsync_ScopesEmployeeAndSupportsAdminFilters()
    {
        var context = CreateContext();
        var otherEmployee = new Employee("Grace", "Hopper", "grace@example.com", EmployeeLevel.Senior, 90m, 8m, "admin");
        context.Employees.Items.Add(otherEmployee);
        var ownLeave = new LeaveRequest(context.Employee.Id, LeaveRequestType.Vacation, DateTime.Today, 8m, "Own", "employee");
        ownLeave.Approve("Admin-only note", "admin");
        var otherLeave = new LeaveRequest(otherEmployee.Id, LeaveRequestType.Permission, DateTime.Today.AddDays(1), 2m, "Other", "employee");
        otherLeave.Reject("Visible to admin", "admin");
        context.LeaveRequests.Items.Add(ownLeave);
        context.LeaveRequests.Items.Add(otherLeave);
        var service = new LeaveRequestService(context.LeaveRequests, context.Employees);

        var employeeRows = await service.GetLeaveRequestsAsync(new LeaveRequestFilter { EmployeeId = otherEmployee.Id }, EmployeeUser(context.Employee.Id));
        var adminRows = await service.GetLeaveRequestsAsync(new LeaveRequestFilter { EmployeeId = otherEmployee.Id, Type = LeaveRequestType.Permission }, AdminUser());

        var employeeRow = Assert.Single(employeeRows);
        var adminRow = Assert.Single(adminRows);
        Assert.Equal(ownLeave.Id, employeeRow.Id);
        Assert.Null(employeeRow.AdminNote);
        Assert.Equal(otherLeave.Id, adminRow.Id);
        Assert.Equal("Visible to admin", adminRow.AdminNote);
    }

    [Fact]
    public async Task CustomerService_ReadsAreAvailableToEmployeeUsers()
    {
        var context = CreateContext();
        var service = new CustomerService(context.Customers);

        var customers = await service.GetCustomersAsync(EmployeeUser(context.Employee.Id));
        var searchResults = await service.SearchCustomersAsync(context.Customer.CompanyName, EmployeeUser(context.Employee.Id));
        var customer = await service.GetCustomerDetailAsync(context.Customer.Id, EmployeeUser(context.Employee.Id));

        Assert.Equal(context.Customer.Id, Assert.Single(customers).Id);
        Assert.Equal(context.Customer.Id, Assert.Single(searchResults).Id);
        Assert.Equal(context.Customer.Id, customer.Id);
    }

    [Fact]
    public async Task GetOvertimeRequestsAsync_IsAdminOnlyAndSupportsFilters()
    {
        var context = CreateContext();
        var otherEmployee = new Employee("Grace", "Hopper", "grace@example.com", EmployeeLevel.Senior, 90m, 8m, "admin");
        context.Employees.Items.Add(otherEmployee);
        var ownOvertime = new OvertimeRequest(context.Employee.Id, DateTime.Today, 1m, "system");
        var otherOvertime = new OvertimeRequest(otherEmployee.Id, DateTime.Today.AddDays(1), 2m, "system");
        context.OvertimeRequests.Items.Add(ownOvertime);
        context.OvertimeRequests.Items.Add(otherOvertime);
        var service = CreateOvertimeRequestService(context);

        await Assert.ThrowsAsync<ArgumentException>(() => service.GetOvertimeRequestsAsync(new OvertimeRequestFilter(), EmployeeUser(context.Employee.Id)));
        var rows = await service.GetOvertimeRequestsAsync(new OvertimeRequestFilter
        {
            EmployeeId = otherEmployee.Id,
            Status = RequestStatus.PendingApproval,
            DateFrom = DateTime.Today,
            DateTo = DateTime.Today.AddDays(2)
        }, AdminUser());

        var row = Assert.Single(rows);
        Assert.Equal(otherOvertime.Id, row.Id);
        Assert.Equal("Grace Hopper", row.EmployeeName);
    }

    [Fact]
    public async Task ApproveOvertimeRequestAsync_IsAdminOnlyAndUpdatesApprovedHoursStatusAndNote()
    {
        var context = CreateContext();
        var overtime = new OvertimeRequest(context.Employee.Id, DateTime.Today, 1m, "system");
        context.OvertimeRequests.Items.Add(overtime);
        var service = CreateOvertimeRequestService(context);

        await Assert.ThrowsAsync<ArgumentException>(() => service.ApproveOvertimeRequestAsync(new ApproveOvertimeRequestRequest
        {
            Id = overtime.Id,
            ApprovedHours = 1m
        }, EmployeeUser(context.Employee.Id)));
        var approved = await service.ApproveOvertimeRequestAsync(new ApproveOvertimeRequestRequest
        {
            Id = overtime.Id,
            ApprovedHours = 1m,
            AdminNote = "Approved"
        }, AdminUser());

        Assert.Equal(RequestStatus.Approved, approved.Status);
        Assert.Equal(1m, approved.ApprovedHours);
        Assert.Equal("Approved", approved.AdminNote);
    }

    [Fact]
    public async Task ApproveOvertimeRequestAsync_RejectsMissingRequestAndInvalidApprovedHours()
    {
        var context = CreateContext();
        var overtime = new OvertimeRequest(context.Employee.Id, DateTime.Today, 1m, "system");
        context.OvertimeRequests.Items.Add(overtime);
        var service = CreateOvertimeRequestService(context);

        await Assert.ThrowsAsync<ArgumentException>(() => service.ApproveOvertimeRequestAsync(new ApproveOvertimeRequestRequest
        {
            Id = Guid.NewGuid(),
            ApprovedHours = 1m
        }, AdminUser()));
        await Assert.ThrowsAsync<ArgumentException>(() => service.ApproveOvertimeRequestAsync(new ApproveOvertimeRequestRequest
        {
            Id = overtime.Id,
            ApprovedHours = 0m
        }, AdminUser()));
        await Assert.ThrowsAsync<ArgumentException>(() => service.ApproveOvertimeRequestAsync(new ApproveOvertimeRequestRequest
        {
            Id = overtime.Id,
            ApprovedHours = 1.25m
        }, AdminUser()));
    }

    [Fact]
    public async Task RejectOvertimeRequestAsync_IsAdminOnlyAndSetsApprovedHoursToZero()
    {
        var context = CreateContext();
        var overtime = new OvertimeRequest(context.Employee.Id, DateTime.Today, 1m, "system");
        context.OvertimeRequests.Items.Add(overtime);
        var service = CreateOvertimeRequestService(context);

        await Assert.ThrowsAsync<ArgumentException>(() => service.RejectOvertimeRequestAsync(new RejectOvertimeRequestRequest { Id = overtime.Id }, EmployeeUser(context.Employee.Id)));
        var rejected = await service.RejectOvertimeRequestAsync(new RejectOvertimeRequestRequest
        {
            Id = overtime.Id,
            AdminNote = "Rejected"
        }, AdminUser());

        Assert.Equal(RequestStatus.Rejected, rejected.Status);
        Assert.Equal(0m, rejected.ApprovedHours);
        Assert.Equal("Rejected", rejected.AdminNote);
    }

    [Fact]
    public async Task TimeCompletenessService_ReportsOvertimePendingApprovedAndRejectedByDomainRules()
    {
        var context = CreateContext();
        AddTimeEntry(context, 9m, date: DateTime.Today);
        AddTimeEntry(context, 9m, date: DateTime.Today.AddDays(1));
        AddTimeEntry(context, 9m, date: DateTime.Today.AddDays(2));
        var approvedOvertime = new OvertimeRequest(context.Employee.Id, DateTime.Today.AddDays(1), 1m, "system");
        approvedOvertime.Approve(1m, "Approved", "admin");
        var rejectedOvertime = new OvertimeRequest(context.Employee.Id, DateTime.Today.AddDays(2), 1m, "system");
        rejectedOvertime.Reject("Rejected", "admin");
        context.OvertimeRequests.Items.Add(new OvertimeRequest(context.Employee.Id, DateTime.Today, 1m, "system"));
        context.OvertimeRequests.Items.Add(approvedOvertime);
        context.OvertimeRequests.Items.Add(rejectedOvertime);

        var completeness = await CreateTimeCompletenessService(context).GetTimeCompletenessAsync(new TimeCompletenessFilter
        {
            DateFrom = DateTime.Today,
            DateTo = DateTime.Today.AddDays(2)
        }, AdminUser());

        Assert.Equal(DailyTimeCompletenessStatus.OvertimePending, Assert.Single(completeness.Rows, x => x.Date == DateTime.Today).Status);
        Assert.Equal(DailyTimeCompletenessStatus.OvertimeApproved, Assert.Single(completeness.Rows, x => x.Date == DateTime.Today.AddDays(1)).Status);
        Assert.Equal(DailyTimeCompletenessStatus.OvertimePending, Assert.Single(completeness.Rows, x => x.Date == DateTime.Today.AddDays(2)).Status);
    }

    [Fact]
    public async Task ProjectService_ProjectList_UsesOnlyRelatedWorkItemsAndTimeEntries()
    {
        var context = CreateContext();
        AddTimeEntry(context, 2m);
        AddUnrelatedProjectWithTimeEntry(context, 10m);
        var service = CreateProjectService(context);

        var projects = await service.SearchProjectsAsync(null, context.Customer.Id, null, null, AdminUser());

        var project = Assert.Single(projects);
        Assert.Equal(context.Project.Id, project.Id);
        Assert.Equal(2m, project.LoggedHours);
    }

    [Fact]
    public async Task ProjectService_ProjectList_WithEmployeeUser_HidesPaymentTypeAndIgnoresPaymentTypeFilter()
    {
        var context = CreateContext(ProjectPaymentType.TimeAndMaterial);
        var otherProject = new Project(context.Customer.Id, "Fixed project", ProjectPaymentType.FixedPrice, ProjectStatus.Active, null, null, null, null, 1000m, "admin");
        context.Projects.Items.Add(otherProject);
        var service = CreateProjectService(context);

        var projects = await service.SearchProjectsAsync(null, context.Customer.Id, null, ProjectPaymentType.FixedPrice, EmployeeUser(context.Employee.Id));

        Assert.Equal(2, projects.Count);
        Assert.All(projects, project => Assert.Null(project.PaymentType));
    }

    [Fact]
    public async Task ProjectService_SearchProjects_FiltersByStatus()
    {
        var context = CreateContext(ProjectPaymentType.TimeAndMaterial);
        var suspendedProject = new Project(context.Customer.Id, "Suspended project", ProjectPaymentType.TimeAndMaterial, ProjectStatus.Suspended, null, 50m, 75m, 100m, null, "admin");
        context.Projects.Items.Add(suspendedProject);
        var service = CreateProjectService(context);

        var projects = await service.SearchProjectsAsync(null, context.Customer.Id, ProjectStatus.Suspended, null, AdminUser());

        var project = Assert.Single(projects);
        Assert.Equal(suspendedProject.Id, project.Id);
        Assert.Equal(ProjectStatus.Suspended, project.Status);
    }

    [Fact]
    public async Task ProjectDetail_UsesOnlySelectedProjectTimeEntries()
    {
        var context = CreateContext();
        AddTimeEntry(context, 2m);
        AddUnrelatedProjectWithTimeEntry(context, 10m);
        var service = CreateProjectService(context);

        var detail = await service.GetProjectDetailAsync(context.Project.Id, AdminUser());

        Assert.Equal(2m, detail.HoursSummary.LoggedHours);
    }

    [Fact]
    public async Task ProjectDetail_WithEmployeeUser_HidesEconomicRatesApprovedHoursAndLevels()
    {
        var context = CreateContext();
        AddTimeEntry(context, 2m, 1m);
        var service = CreateProjectService(context);

        var detail = await service.GetProjectDetailAsync(context.Project.Id, EmployeeUser(context.Employee.Id));

        Assert.Null(detail.PaymentType);
        Assert.Null(detail.JuniorRate);
        Assert.Null(detail.MidRate);
        Assert.Null(detail.SeniorRate);
        Assert.Null(detail.FixedAmount);
        Assert.Equal(0m, detail.HoursSummary.ApprovedHours);
        Assert.Null(detail.EconomicsSummary);
        var member = Assert.Single(detail.TeamSummary);
        Assert.Null(member.Level);
        Assert.Equal(0m, member.ApprovedHours);
        Assert.False(detail.Capabilities.CanViewEconomics);
        Assert.False(detail.Capabilities.CanViewPayments);
        Assert.False(detail.Capabilities.CanViewContractPeriods);
    }

    [Fact]
    public async Task CreateProjectAsync_TimeAndMaterialRequiresPositiveRates()
    {
        var context = CreateContext();
        var service = CreateProjectService(context);

        var request = new CreateProjectRequest
        {
            CustomerId = context.Customer.Id,
            Name = "T&M project",
            PaymentType = ProjectPaymentType.TimeAndMaterial,
            Status = ProjectStatus.Active
        };

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateProjectAsync(request, AdminUser()));

        Assert.Contains("JuniorRate", exception.Message);
    }

    [Fact]
    public async Task CreateProjectAsync_FixedPriceRequiresPositiveAmount()
    {
        var context = CreateContext();
        var service = CreateProjectService(context);

        var request = new CreateProjectRequest
        {
            CustomerId = context.Customer.Id,
            Name = "Fixed project",
            PaymentType = ProjectPaymentType.FixedPrice,
            Status = ProjectStatus.Active
        };

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateProjectAsync(request, AdminUser()));

        Assert.Contains("FixedAmount", exception.Message);
    }

    [Theory]
    [InlineData(ProjectPaymentType.AnnualRetainer)]
    [InlineData(ProjectPaymentType.Internal)]
    public async Task CreateProjectAsync_NonBaseEconomicTypesDoNotRequireProjectAmount(ProjectPaymentType paymentType)
    {
        var context = CreateContext();
        var service = CreateProjectService(context);

        var project = await service.CreateProjectAsync(new CreateProjectRequest
        {
            CustomerId = context.Customer.Id,
            Name = $"{paymentType} project",
            PaymentType = paymentType,
            Status = ProjectStatus.Active
        }, AdminUser());

        Assert.Equal(paymentType, project.PaymentType);
        Assert.Null(project.FixedAmount);
        Assert.Null(project.JuniorRate);
        Assert.Null(project.MidRate);
        Assert.Null(project.SeniorRate);
    }

    [Fact]
    public async Task CreateProjectAsync_SetsDefaultProjectAndRejectsSecondDefaultForCustomer()
    {
        var context = CreateContext();
        var service = CreateProjectService(context);

        var defaultProject = await service.CreateProjectAsync(new CreateProjectRequest
        {
            CustomerId = context.Customer.Id,
            Name = "Default project",
            PaymentType = ProjectPaymentType.Internal,
            Status = ProjectStatus.Active,
            IsDefault = true
        }, AdminUser());

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateProjectAsync(new CreateProjectRequest
        {
            CustomerId = context.Customer.Id,
            Name = "Second default project",
            PaymentType = ProjectPaymentType.Internal,
            Status = ProjectStatus.Active,
            IsDefault = true
        }, AdminUser()));
        var projects = await service.GetProjectsAsync(AdminUser());

        Assert.True(defaultProject.IsDefault);
        Assert.Contains("default project", exception.Message);
        Assert.Single(projects, project => project.IsDefault);
    }

    [Fact]
    public async Task UpdateProjectAsync_AllowsSameDefaultProjectAndRejectsConflictingDefault()
    {
        var context = CreateContext();
        context.Project.Update(context.Customer.Id, context.Project.Name, context.Project.PaymentType, context.Project.Status, context.Project.Notes, context.Project.JuniorRate, context.Project.MidRate, context.Project.SeniorRate, context.Project.FixedAmount, "admin", true);
        var otherProject = new Project(context.Customer.Id, "Other project", ProjectPaymentType.Internal, ProjectStatus.Active, null, null, null, null, null, "admin");
        context.Projects.Items.Add(otherProject);
        var service = CreateProjectService(context);

        var updatedDefault = await service.UpdateProjectAsync(new UpdateProjectRequest
        {
            Id = context.Project.Id,
            CustomerId = context.Customer.Id,
            Name = context.Project.Name,
            PaymentType = context.Project.PaymentType,
            Status = context.Project.Status,
            Notes = context.Project.Notes,
            JuniorRate = context.Project.JuniorRate,
            MidRate = context.Project.MidRate,
            SeniorRate = context.Project.SeniorRate,
            FixedAmount = context.Project.FixedAmount,
            IsDefault = true
        }, AdminUser());
        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.UpdateProjectAsync(new UpdateProjectRequest
        {
            Id = otherProject.Id,
            CustomerId = context.Customer.Id,
            Name = otherProject.Name,
            PaymentType = otherProject.PaymentType,
            Status = otherProject.Status,
            IsDefault = true
        }, AdminUser()));

        Assert.True(updatedDefault.IsDefault);
        Assert.Contains("default project", exception.Message);
    }

    [Fact]
    public async Task CreateProjectAsync_WithEmployeeUserThrowsArgumentException()
    {
        var context = CreateContext();
        var service = CreateProjectService(context);

        var request = new CreateProjectRequest
        {
            CustomerId = context.Customer.Id,
            Name = "Internal project",
            PaymentType = ProjectPaymentType.Internal,
            Status = ProjectStatus.Active
        };

        var exception = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateProjectAsync(request, EmployeeUser(context.Employee.Id)));

        Assert.Contains("requires Admin role", exception.Message);
    }

    [Fact]
    public async Task UpdateProjectAsync_UpdatesCustomerPaymentTypeAndBaseFields()
    {
        var context = CreateContext();
        var customer = new Customer("New customer", "new.test", "New", "new@example.com", null, "admin");
        context.Customers.Items.Add(customer);
        var service = CreateProjectService(context);

        var project = await service.UpdateProjectAsync(new UpdateProjectRequest
        {
            Id = context.Project.Id,
            CustomerId = customer.Id,
            Name = "Updated project",
            PaymentType = ProjectPaymentType.FixedPrice,
            Status = ProjectStatus.Suspended,
            Notes = "Updated notes",
            FixedAmount = 12000m
        }, AdminUser());

        Assert.Equal(customer.Id, project.CustomerId);
        Assert.Equal("Updated project", project.Name);
        Assert.Equal(ProjectPaymentType.FixedPrice, project.PaymentType);
        Assert.Equal(ProjectStatus.Suspended, project.Status);
        Assert.Equal("Updated notes", project.Notes);
        Assert.Equal(12000m, project.FixedAmount);
        Assert.Null(project.JuniorRate);
        Assert.Null(project.MidRate);
        Assert.Null(project.SeniorRate);
    }

    [Fact]
    public async Task CustomerReport_ExcludesUnrelatedCustomerProjectAndTimeEntries()
    {
        var context = CreateContext();
        AddTimeEntry(context, 2m);
        AddUnrelatedProjectWithTimeEntry(context, 10m);
        var reportService = CreateProjectReportService(context);

        var report = await reportService.GetCustomerReportAsync(new CustomerReportFilter
        {
            CustomerId = context.Customer.Id,
            DateFrom = DateTime.Today,
            DateTo = DateTime.Today
        }, AdminUser());

        Assert.Single(report.Rows);
        Assert.Equal(2m, report.TotalHours);
    }

    [Fact]
    public async Task CustomerReport_RequiresAdminCustomerAndValidDateRange()
    {
        var context = CreateContext();
        var reportService = CreateProjectReportService(context);

        await Assert.ThrowsAsync<ArgumentException>(() => reportService.GetCustomerReportAsync(new CustomerReportFilter
        {
            CustomerId = context.Customer.Id,
            DateFrom = DateTime.Today,
            DateTo = DateTime.Today
        }, EmployeeUser(context.Employee.Id)));
        await Assert.ThrowsAsync<ArgumentException>(() => reportService.GetCustomerReportAsync(new CustomerReportFilter
        {
            DateFrom = DateTime.Today,
            DateTo = DateTime.Today
        }, AdminUser()));
        await Assert.ThrowsAsync<ArgumentException>(() => reportService.GetCustomerReportAsync(new CustomerReportFilter
        {
            CustomerId = context.Customer.Id,
            DateTo = DateTime.Today
        }, AdminUser()));
        await Assert.ThrowsAsync<ArgumentException>(() => reportService.GetCustomerReportAsync(new CustomerReportFilter
        {
            CustomerId = context.Customer.Id,
            DateFrom = DateTime.Today,
            DateTo = DateTime.Today.AddDays(-1)
        }, AdminUser()));
    }

    [Fact]
    public async Task CustomerReport_UsesApprovedTimeAndRequestedDateRange()
    {
        var context = CreateContext();
        AddTimeEntry(context, 4m, approvedTime: 2m, date: DateTime.Today);
        AddTimeEntry(context, 8m, approvedTime: 8m, date: DateTime.Today.AddDays(-10));
        var reportService = CreateProjectReportService(context);

        var report = await reportService.GetCustomerReportAsync(new CustomerReportFilter
        {
            CustomerId = context.Customer.Id,
            DateFrom = DateTime.Today,
            DateTo = DateTime.Today
        }, AdminUser());

        Assert.Equal(4m, report.TotalHours);
        Assert.Equal(2m, report.ApprovedHours);
        Assert.Equal(240m, report.WorkedValue);
        Assert.Equal(2m, Assert.Single(report.Rows).ApprovedHours);
    }

    [Fact]
    public async Task CustomerReport_ProjectFilterCannotEscapeSelectedCustomer()
    {
        var context = CreateContext();
        var otherCustomer = new Customer("Other", "other.test", "Other", "other@example.com", null, "admin");
        var otherProject = new Project(otherCustomer.Id, "Other project", ProjectPaymentType.TimeAndMaterial, ProjectStatus.Active, null, 60m, 90m, 120m, null, "admin");
        var otherWorkItem = new WorkItem("WL-X", otherProject.Id, "Other task", "Other", context.NewStatus.Key, WorkItemPriority.Normal, context.Employee.Email, "reporter@example.com", WorkItemOrigin.Manual, null, DateTime.Today, false, "admin");
        context.Customers.Items.Add(otherCustomer);
        context.Projects.Items.Add(otherProject);
        context.WorkItems.Items.Add(otherWorkItem);
        context.TimeEntries.Items.Add(new TimeEntry(context.Employee.Id, otherWorkItem.Id, otherProject.Id, DateTime.Today, 10m, 10m, "Other", null, RequestStatus.PendingApproval, null, context.Employee.Level, context.Employee.DefaultHourlyRate, 120m, "employee"));
        var reportService = CreateProjectReportService(context);

        var report = await reportService.GetCustomerReportAsync(new CustomerReportFilter
        {
            CustomerId = context.Customer.Id,
            ProjectId = otherProject.Id,
            DateFrom = DateTime.Today,
            DateTo = DateTime.Today
        }, AdminUser());

        Assert.Empty(report.Rows);
        Assert.Equal(0m, report.TotalHours);
        Assert.Equal(context.Customer.Id, report.CustomerId);
    }

    [Fact]
    public async Task CustomerReport_EmptyCustomerData_ReturnsValidEmptyReport()
    {
        var context = CreateContext();
        var emptyCustomer = new Customer("Empty", "empty.test", "Empty", "empty@example.com", null, "admin");
        context.Customers.Items.Add(emptyCustomer);
        var reportService = CreateProjectReportService(context);

        var report = await reportService.GetCustomerReportAsync(new CustomerReportFilter
        {
            CustomerId = emptyCustomer.Id,
            DateFrom = DateTime.Today,
            DateTo = DateTime.Today
        }, AdminUser());

        Assert.Empty(report.Rows);
        Assert.Equal(emptyCustomer.Id, report.CustomerId);
        Assert.Equal(DateTime.Today, report.DateFrom);
        Assert.Equal(DateTime.Today, report.DateTo);
    }

    [Fact]
    public async Task TimeCompletenessService_UsesOnlyRequestedDateRange()
    {
        var context = CreateContext();
        AddTimeEntry(context, 8m, date: DateTime.Today);
        AddTimeEntry(context, 8m, date: DateTime.Today.AddDays(-10));

        var completeness = await CreateTimeCompletenessService(context).GetTimeCompletenessAsync(new TimeCompletenessFilter
        {
            DateFrom = DateTime.Today,
            DateTo = DateTime.Today
        }, AdminUser());

        var row = Assert.Single(completeness.Rows);
        Assert.Equal(DateTime.Today, row.Date);
        Assert.Equal(8m, row.WorkItemHours);
    }

    [Fact]
    public async Task TimeCompletenessService_WithEmployeeUser_ReturnsOnlyCurrentEmployee()
    {
        var context = CreateContext();
        AddTimeEntry(context, 8m, date: DateTime.Today);
        var otherEmployee = new Employee("Alan", "Turing", "alan@example.com", EmployeeLevel.Senior, 90m, 8m, "admin");
        context.Employees.Items.Add(otherEmployee);
        context.TimeEntries.Items.Add(new TimeEntry(otherEmployee.Id, context.WorkItem.Id, context.Project.Id, DateTime.Today, 4m, 4m, "Other", null, RequestStatus.PendingApproval, null, EmployeeLevel.Senior, 90m, 120m, "admin"));

        var service = CreateTimeCompletenessService(context);
        var otherEmployeeCompleteness = await service.GetTimeCompletenessAsync(new TimeCompletenessFilter
        {
            EmployeeId = otherEmployee.Id,
            DateFrom = DateTime.Today,
            DateTo = DateTime.Today
        }, EmployeeUser(context.Employee.Id));

        Assert.Empty(otherEmployeeCompleteness.Rows);

        var ownCompleteness = await service.GetTimeCompletenessAsync(new TimeCompletenessFilter
        {
            DateFrom = DateTime.Today,
            DateTo = DateTime.Today
        }, EmployeeUser(context.Employee.Id));

        var row = Assert.Single(ownCompleteness.Rows);
        Assert.Equal(context.Employee.Id, row.EmployeeId);
        Assert.Equal(8m, row.WorkItemHours);
    }

    [Fact]
    public async Task OvertimeDetail_UsesOnlyEmployeeDayTimeEntries()
    {
        var context = CreateContext();
        AddTimeEntry(context, 9m, date: DateTime.Today);
        AddTimeEntry(context, 4m, date: DateTime.Today.AddDays(-1));
        var unrelatedEmployee = new Employee("Alan", "Turing", "alan@example.com", EmployeeLevel.Senior, 90m, 8m, "admin");
        context.Employees.Items.Add(unrelatedEmployee);
        context.TimeEntries.Items.Add(new TimeEntry(unrelatedEmployee.Id, context.WorkItem.Id, context.Project.Id, DateTime.Today, 5m, 5m, "Other", null, RequestStatus.PendingApproval, null, EmployeeLevel.Senior, 90m, 120m, "admin"));
        var overtime = new OvertimeRequest(context.Employee.Id, DateTime.Today, 1m, "system");
        context.OvertimeRequests.Items.Add(overtime);

        var detail = await CreateOvertimeRequestService(context).GetOvertimeRequestDetailAsync(overtime.Id, AdminUser());

        Assert.Single(detail.DayTimeEntries);
        Assert.Equal(9m, detail.DayTimeEntries.Single().Time);
    }

    private static TestContext CreateContext(ProjectPaymentType paymentType = ProjectPaymentType.TimeAndMaterial)
    {
        var context = new TestContext();
        context.Employee = new Employee("Ada", "Lovelace", "ada@example.com", EmployeeLevel.Senior, 90m, 8m, "admin");
        context.Customer = new Customer("ACME", "acme.test", "Grace", "grace@example.com", null, "admin");
        context.Project = paymentType == ProjectPaymentType.TimeAndMaterial
            ? new Project(context.Customer.Id, "Project", paymentType, ProjectStatus.Active, null, 60m, 90m, 120m, null, "admin")
            : new Project(context.Customer.Id, "Project", paymentType, ProjectStatus.Active, null, null, null, null, paymentType == ProjectPaymentType.FixedPrice ? 10000m : null, "admin");
        context.NewStatus = new StatusConfig("new", "New", WorkItemStatusTypology.New, "New", 10, true, "admin");
        context.ClosedStatus = new StatusConfig("closed", "Closed", WorkItemStatusTypology.Closed, "Closed", 90, true, "admin");
        context.WorkItem = new WorkItem("WL-1", context.Project.Id, "Task", "Task description", context.NewStatus.Key, WorkItemPriority.Normal, context.Employee.Email, "reporter@example.com", WorkItemOrigin.Manual, null, DateTime.Today, false, "admin");
        context.Employees.Items.Add(context.Employee);
        context.Customers.Items.Add(context.Customer);
        context.Projects.Items.Add(context.Project);
        context.StatusConfigs.Items.Add(context.NewStatus);
        context.StatusConfigs.Items.Add(context.ClosedStatus);
        context.WorkItems.Items.Add(context.WorkItem);
        return context;
    }

    private static TimeEntry AddTimeEntry(TestContext context, decimal time, decimal? approvedTime = null, decimal? projectRateSnapshot = null, DateTime? date = null)
    {
        var entry = new TimeEntry(context.Employee.Id, context.WorkItem.Id, context.Project.Id, date ?? DateTime.Today, time, approvedTime.GetValueOrDefault(time), "Work", null, RequestStatus.PendingApproval, null, context.Employee.Level, context.Employee.DefaultHourlyRate, projectRateSnapshot.GetValueOrDefault(120m), "employee");
        context.TimeEntries.Items.Add(entry);
        return entry;
    }

    private static TimeEntryService CreateTimeEntryService(TestContext context)
    {
        return new TimeEntryService(context.TimeEntries, context.Employees, context.WorkItems, context.Projects, context.Customers, context.LeaveRequests, context.OvertimeRequests);
    }

    private static ProjectReportService CreateProjectReportService(TestContext context)
    {
        return new ProjectReportService(context.Projects, context.WorkItems, context.TimeEntries, context.ProjectPayments, context.ContractPeriods, context.Customers);
    }

    private static ProjectService CreateProjectService(TestContext context)
    {
        return new ProjectService(context.Projects, context.Customers, context.ProjectMilestones, context.WorkItems, context.TimeEntries, context.ProjectPayments, context.ContractPeriods, context.Employees, context.StatusConfigs, CreateProjectReportService(context));
    }

    private static TimeCompletenessService CreateTimeCompletenessService(TestContext context)
    {
        return new TimeCompletenessService(context.Employees, context.TimeEntries, context.LeaveRequests, context.OvertimeRequests);
    }

    private static OvertimeRequestService CreateOvertimeRequestService(TestContext context)
    {
        return new OvertimeRequestService(context.OvertimeRequests, context.Employees, context.TimeEntries, CreateTimeEntryService(context));
    }

    private static void AddUnrelatedProjectWithTimeEntry(TestContext context, decimal time)
    {
        var customer = new Customer("Other", "other.test", "Other", "other@example.com", null, "admin");
        var project = new Project(customer.Id, "Other project", ProjectPaymentType.TimeAndMaterial, ProjectStatus.Active, null, 60m, 90m, 120m, null, "admin");
        var workItem = new WorkItem("WL-X", project.Id, "Other task", "Other", context.NewStatus.Key, WorkItemPriority.Normal, context.Employee.Email, "reporter@example.com", WorkItemOrigin.Manual, null, DateTime.Today, false, "admin");
        context.Customers.Items.Add(customer);
        context.Projects.Items.Add(project);
        context.WorkItems.Items.Add(workItem);
        context.TimeEntries.Items.Add(new TimeEntry(context.Employee.Id, workItem.Id, project.Id, DateTime.Today, time, time, "Other work", null, RequestStatus.PendingApproval, null, context.Employee.Level, context.Employee.DefaultHourlyRate, 120m, "employee"));
    }

    private static WorkLogUserContext AdminUser()
    {
        return new WorkLogUserContext
        {
            UserId = Guid.NewGuid(),
            EmployeeId = Guid.NewGuid(),
            Email = "admin@example.com",
            Role = ApplicationUserRole.Admin
        };
    }

    private static WorkLogUserContext EmployeeUser(Guid employeeId)
    {
        return new WorkLogUserContext
        {
            UserId = Guid.NewGuid(),
            EmployeeId = employeeId,
            Email = "employee@example.com",
            Role = ApplicationUserRole.Employee
        };
    }

    private class TestContext
    {
        public InMemoryRepository<Employee> Employees { get; } = new();
        public InMemoryRepository<Customer> Customers { get; } = new();
        public InMemoryRepository<Project> Projects { get; } = new();
        public InMemoryRepository<ProjectMilestone> ProjectMilestones { get; } = new();
        public InMemoryRepository<WorkItem> WorkItems { get; } = new();
        public InMemoryRepository<TimeEntry> TimeEntries { get; } = new();
        public InMemoryRepository<ProjectPayment> ProjectPayments { get; } = new();
        public InMemoryRepository<ProjectContractPeriod> ContractPeriods { get; } = new();
        public InMemoryRepository<LeaveRequest> LeaveRequests { get; } = new();
        public InMemoryRepository<OvertimeRequest> OvertimeRequests { get; } = new();
        public InMemoryRepository<StatusConfig> StatusConfigs { get; } = new();
        public Employee Employee { get; set; }
        public Customer Customer { get; set; }
        public Project Project { get; set; }
        public WorkItem WorkItem { get; set; }
        public StatusConfig NewStatus { get; set; }
        public StatusConfig ClosedStatus { get; set; }
    }
}
