using System;
using SC.WorkLog.Domain.DomainServices;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Tests.Domain;

public class DailyTimeCompletenessCalculatorTests
{
    [Fact]
    public void Calculate_ExactExpectedHours_IsOK()
    {
        var employee = WorkLogCalculatorTestFactory.Employee(expectedDailyHours: 8m);
        var project = WorkLogCalculatorTestFactory.Project(ProjectPaymentType.Internal);
        var workItem = WorkLogCalculatorTestFactory.WorkItem(project);
        var entry = WorkLogCalculatorTestFactory.TimeEntry(employee, workItem, new DateTime(2026, 1, 10), 8m, 1m);

        var result = DailyTimeCompletenessCalculator.Calculate(employee, new DateTime(2026, 1, 10), new[] { entry }, Array.Empty<SC.WorkLog.Domain.AggregateRoots.LeaveRequest>(), Array.Empty<SC.WorkLog.Domain.AggregateRoots.OvertimeRequest>());

        Assert.Equal(DailyTimeCompletenessStatus.OK, result.Status);
    }

    [Fact]
    public void Calculate_BelowExpectedHours_IsMissingHours()
    {
        var employee = WorkLogCalculatorTestFactory.Employee(expectedDailyHours: 8m);
        var project = WorkLogCalculatorTestFactory.Project(ProjectPaymentType.Internal);
        var workItem = WorkLogCalculatorTestFactory.WorkItem(project);
        var entry = WorkLogCalculatorTestFactory.TimeEntry(employee, workItem, new DateTime(2026, 1, 10), 6m, 1m);

        var result = DailyTimeCompletenessCalculator.Calculate(employee, new DateTime(2026, 1, 10), new[] { entry }, Array.Empty<SC.WorkLog.Domain.AggregateRoots.LeaveRequest>(), Array.Empty<SC.WorkLog.Domain.AggregateRoots.OvertimeRequest>());

        Assert.Equal(DailyTimeCompletenessStatus.MissingHours, result.Status);
        Assert.Equal(2m, result.MissingHours);
    }

    [Fact]
    public void Calculate_AboveExpectedWithoutApprovedOvertime_IsOvertimePending()
    {
        var employee = WorkLogCalculatorTestFactory.Employee(expectedDailyHours: 8m);
        var project = WorkLogCalculatorTestFactory.Project(ProjectPaymentType.Internal);
        var workItem = WorkLogCalculatorTestFactory.WorkItem(project);
        var entry = WorkLogCalculatorTestFactory.TimeEntry(employee, workItem, new DateTime(2026, 1, 10), 9m, 1m);

        var result = DailyTimeCompletenessCalculator.Calculate(employee, new DateTime(2026, 1, 10), new[] { entry }, Array.Empty<SC.WorkLog.Domain.AggregateRoots.LeaveRequest>(), Array.Empty<SC.WorkLog.Domain.AggregateRoots.OvertimeRequest>());

        Assert.Equal(DailyTimeCompletenessStatus.OvertimePending, result.Status);
        Assert.Equal(1m, result.OvertimeHours);
    }

    [Fact]
    public void Calculate_AboveExpectedWithApprovedOvertime_IsOvertimeApproved()
    {
        var employee = WorkLogCalculatorTestFactory.Employee(expectedDailyHours: 8m);
        var project = WorkLogCalculatorTestFactory.Project(ProjectPaymentType.Internal);
        var workItem = WorkLogCalculatorTestFactory.WorkItem(project);
        var date = new DateTime(2026, 1, 10);
        var entry = WorkLogCalculatorTestFactory.TimeEntry(employee, workItem, date, 9m, 1m);
        var overtime = WorkLogCalculatorTestFactory.ApprovedOvertime(employee, date, 1m);

        var result = DailyTimeCompletenessCalculator.Calculate(employee, date, new[] { entry }, Array.Empty<SC.WorkLog.Domain.AggregateRoots.LeaveRequest>(), new[] { overtime });

        Assert.Equal(DailyTimeCompletenessStatus.OvertimeApproved, result.Status);
    }
}
