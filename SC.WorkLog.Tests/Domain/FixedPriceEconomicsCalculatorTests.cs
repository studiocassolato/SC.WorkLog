using System;
using SC.WorkLog.Domain.DomainServices;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Tests.Domain;

public class FixedPriceEconomicsCalculatorTests
{
    [Fact]
    public void Calculate_ComputesBudgetConsumption()
    {
        var employee = WorkLogCalculatorTestFactory.Employee(defaultRate: 50m);
        var project = WorkLogCalculatorTestFactory.Project(ProjectPaymentType.FixedPrice, fixedAmount: 1000m);
        var workItem = WorkLogCalculatorTestFactory.WorkItem(project);
        var entry = WorkLogCalculatorTestFactory.TimeEntry(employee, workItem, new DateTime(2026, 1, 10), 5m, 5m, defaultRate: 50m);

        var result = FixedPriceEconomicsCalculator.Calculate(project, new[] { workItem }, new[] { entry });

        Assert.Equal(250m, result.InternalValueUsed);
        Assert.Equal(0.25m, result.BudgetConsumptionPercentage);
        Assert.Equal(200m, result.EffectiveHourlyAverage);
        Assert.False(result.OverBudget);
    }

    [Fact]
    public void Calculate_DetectsOverBudget()
    {
        var employee = WorkLogCalculatorTestFactory.Employee(defaultRate: 50m);
        var project = WorkLogCalculatorTestFactory.Project(ProjectPaymentType.FixedPrice, fixedAmount: 100m);
        var workItem = WorkLogCalculatorTestFactory.WorkItem(project);
        var entry = WorkLogCalculatorTestFactory.TimeEntry(employee, workItem, new DateTime(2026, 1, 10), 3m, 3m, defaultRate: 50m);

        var result = FixedPriceEconomicsCalculator.Calculate(project, new[] { workItem }, new[] { entry });

        Assert.True(result.OverBudget);
        Assert.Equal(-50m, result.RemainingTheoreticalMargin);
    }

    [Fact]
    public void Calculate_HandlesNoApprovedHours()
    {
        var project = WorkLogCalculatorTestFactory.Project(ProjectPaymentType.FixedPrice, fixedAmount: 1000m);

        var result = FixedPriceEconomicsCalculator.Calculate(project, Array.Empty<SC.WorkLog.Domain.AggregateRoots.WorkItem>(), Array.Empty<SC.WorkLog.Domain.AggregateRoots.TimeEntry>());

        Assert.Equal(0m, result.EffectiveHourlyAverage);
        Assert.Equal(0m, result.BudgetConsumptionPercentage);
    }
}
