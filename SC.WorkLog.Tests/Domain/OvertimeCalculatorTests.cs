using System;
using SC.WorkLog.Domain.DomainServices;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Tests.Domain;

public class OvertimeCalculatorTests
{
    [Fact]
    public void Calculate_NoOvertime_WhenTotalIsLessThanOrEqualExpected()
    {
        var employee = WorkLogCalculatorTestFactory.Employee(expectedDailyHours: 8m);
        var project = WorkLogCalculatorTestFactory.Project(ProjectPaymentType.Internal);
        var workItem = WorkLogCalculatorTestFactory.WorkItem(project);
        var entry = WorkLogCalculatorTestFactory.TimeEntry(employee, workItem, new DateTime(2026, 1, 10), 8m, 1m);

        var result = OvertimeCalculator.Calculate(employee, new DateTime(2026, 1, 10), new[] { entry }, Array.Empty<SC.WorkLog.Domain.AggregateRoots.LeaveRequest>(), null);

        Assert.False(result.OvertimeRequired);
        Assert.Equal(OvertimeCalculationAction.None, result.SuggestedAction);
    }

    [Fact]
    public void Calculate_RequiresOvertime_WhenTotalExceedsExpected()
    {
        var employee = WorkLogCalculatorTestFactory.Employee(expectedDailyHours: 8m);
        var project = WorkLogCalculatorTestFactory.Project(ProjectPaymentType.Internal);
        var workItem = WorkLogCalculatorTestFactory.WorkItem(project);
        var entry = WorkLogCalculatorTestFactory.TimeEntry(employee, workItem, new DateTime(2026, 1, 10), 9m, 1m);

        var result = OvertimeCalculator.Calculate(employee, new DateTime(2026, 1, 10), new[] { entry }, Array.Empty<SC.WorkLog.Domain.AggregateRoots.LeaveRequest>(), null);

        Assert.True(result.OvertimeRequired);
        Assert.Equal(1m, result.CalculatedOvertimeHours);
        Assert.Equal(OvertimeCalculationAction.Create, result.SuggestedAction);
    }
}
