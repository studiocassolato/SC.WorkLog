using System;
using System.Linq;
using SC.WorkLog.Domain.DomainServices;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Tests.Domain;

public class AnnualRetainerEconomicsCalculatorTests
{
    [Fact]
    public void Calculate_AssignsEntriesByTimeEntryDate()
    {
        var employee = WorkLogCalculatorTestFactory.Employee(defaultRate: 80m);
        var project = WorkLogCalculatorTestFactory.Project(ProjectPaymentType.AnnualRetainer);
        var workItem = WorkLogCalculatorTestFactory.WorkItem(project);
        var january = WorkLogCalculatorTestFactory.ProjectContractPeriod(project, new DateTime(2026, 1, 1), new DateTime(2026, 1, 31), 500m);
        var february = WorkLogCalculatorTestFactory.ProjectContractPeriod(project, new DateTime(2026, 2, 1), new DateTime(2026, 2, 28), 500m);
        var entries = new[]
        {
            WorkLogCalculatorTestFactory.TimeEntry(employee, workItem, new DateTime(2026, 1, 20), 1m, 1m, defaultRate: 80m),
            WorkLogCalculatorTestFactory.TimeEntry(employee, workItem, new DateTime(2026, 2, 20), 2m, 2m, defaultRate: 80m)
        };

        var results = AnnualRetainerEconomicsCalculator.Calculate(project, new[] { january, february }, new[] { workItem }, entries);

        Assert.Equal(80m, results.Single(x => x.ContractPeriodId == january.Id).InternalValueUsed);
        Assert.Equal(160m, results.Single(x => x.ContractPeriodId == february.Id).InternalValueUsed);
    }

    [Fact]
    public void Calculate_AllowsSameWorkItemToContributeToDifferentPeriods()
    {
        var employee = WorkLogCalculatorTestFactory.Employee(defaultRate: 100m);
        var project = WorkLogCalculatorTestFactory.Project(ProjectPaymentType.AnnualRetainer);
        var workItem = WorkLogCalculatorTestFactory.WorkItem(project);
        var firstPeriod = WorkLogCalculatorTestFactory.ProjectContractPeriod(project, new DateTime(2026, 1, 1), new DateTime(2026, 1, 31), 1000m);
        var secondPeriod = WorkLogCalculatorTestFactory.ProjectContractPeriod(project, new DateTime(2026, 2, 1), new DateTime(2026, 2, 28), 1000m);
        var entries = new[]
        {
            WorkLogCalculatorTestFactory.TimeEntry(employee, workItem, new DateTime(2026, 1, 5), 1m, 1m, defaultRate: 100m),
            WorkLogCalculatorTestFactory.TimeEntry(employee, workItem, new DateTime(2026, 2, 5), 1m, 1m, defaultRate: 100m)
        };

        var results = AnnualRetainerEconomicsCalculator.Calculate(project, new[] { firstPeriod, secondPeriod }, new[] { workItem }, entries);

        Assert.All(results, result => Assert.Equal(1m, result.ApprovedHours));
    }

    [Fact]
    public void Calculate_DetectsOverRetainer()
    {
        var employee = WorkLogCalculatorTestFactory.Employee(defaultRate: 100m);
        var project = WorkLogCalculatorTestFactory.Project(ProjectPaymentType.AnnualRetainer);
        var workItem = WorkLogCalculatorTestFactory.WorkItem(project);
        var period = WorkLogCalculatorTestFactory.ProjectContractPeriod(project, new DateTime(2026, 1, 1), new DateTime(2026, 1, 31), 100m);
        var entry = WorkLogCalculatorTestFactory.TimeEntry(employee, workItem, new DateTime(2026, 1, 5), 2m, 2m, defaultRate: 100m);

        var result = AnnualRetainerEconomicsCalculator.Calculate(project, new[] { period }, new[] { workItem }, new[] { entry }).Single();

        Assert.Equal(RetainerPeriodStatus.OverRetainer, result.Status);
        Assert.Equal(-100m, result.Balance);
    }

    [Fact]
    public void FindActiveContractPeriod_ReturnsPeriodContainingDate()
    {
        var project = WorkLogCalculatorTestFactory.Project(ProjectPaymentType.AnnualRetainer);
        var january = WorkLogCalculatorTestFactory.ProjectContractPeriod(project, new DateTime(2026, 1, 1), new DateTime(2026, 1, 31), 500m);
        var february = WorkLogCalculatorTestFactory.ProjectContractPeriod(project, new DateTime(2026, 2, 1), new DateTime(2026, 2, 28), 500m);

        var active = AnnualRetainerEconomicsCalculator.FindActiveContractPeriod(new[] { january, february }, new DateTime(2026, 2, 10));

        Assert.Equal(february.Id, active.Id);
    }
}
