using System;
using System.Collections.Generic;
using System.Linq;
using SC.WorkLog.Domain.DomainServices;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Tests.Domain;

public class TimeAndMaterialEconomicsCalculatorTests
{
    [Fact]
    public void Calculate_UsesApprovedTime_ForWorkedValue()
    {
        var employee = WorkLogCalculatorTestFactory.Employee();
        var project = WorkLogCalculatorTestFactory.Project(ProjectPaymentType.TimeAndMaterial);
        var workItem = WorkLogCalculatorTestFactory.WorkItem(project);
        var entry = WorkLogCalculatorTestFactory.TimeEntry(employee, workItem, new DateTime(2026, 1, 10), 8m, 3m, projectRate: 120m);

        var result = TimeAndMaterialEconomicsCalculator.Calculate(project, new[] { workItem }, new[] { entry }, Array.Empty<SC.WorkLog.Domain.AggregateRoots.ProjectPayment>());

        Assert.Equal(3m, result.ApprovedHours);
        Assert.Equal(360m, result.WorkedValue);
    }

    [Theory]
    [InlineData(300, TimeAndMaterialBalanceStatus.CreditAvailable)]
    [InlineData(200, TimeAndMaterialBalanceStatus.Balanced)]
    [InlineData(100, TimeAndMaterialBalanceStatus.OverCredit)]
    public void Calculate_ReturnsExpectedBalanceStatus(decimal paymentAmount, TimeAndMaterialBalanceStatus expectedStatus)
    {
        var employee = WorkLogCalculatorTestFactory.Employee();
        var project = WorkLogCalculatorTestFactory.Project(ProjectPaymentType.TimeAndMaterial);
        var workItem = WorkLogCalculatorTestFactory.WorkItem(project);
        var entry = WorkLogCalculatorTestFactory.TimeEntry(employee, workItem, new DateTime(2026, 1, 10), 2m, 2m, projectRate: 100m);
        var payment = WorkLogCalculatorTestFactory.ProjectPayment(project, new DateTime(2026, 1, 12), paymentAmount);

        var result = TimeAndMaterialEconomicsCalculator.Calculate(project, new[] { workItem }, new[] { entry }, new[] { payment });

        Assert.Equal(expectedStatus, result.BalanceStatus);
    }

    [Fact]
    public void Calculate_BuildsMonthlyCumulativeBalance()
    {
        var employee = WorkLogCalculatorTestFactory.Employee();
        var project = WorkLogCalculatorTestFactory.Project(ProjectPaymentType.TimeAndMaterial);
        var workItem = WorkLogCalculatorTestFactory.WorkItem(project);
        var entries = new[]
        {
            WorkLogCalculatorTestFactory.TimeEntry(employee, workItem, new DateTime(2026, 1, 10), 2m, 2m, projectRate: 100m),
            WorkLogCalculatorTestFactory.TimeEntry(employee, workItem, new DateTime(2026, 2, 10), 1m, 1m, projectRate: 100m)
        };
        var payments = new[]
        {
            WorkLogCalculatorTestFactory.ProjectPayment(project, new DateTime(2026, 1, 15), 100m),
            WorkLogCalculatorTestFactory.ProjectPayment(project, new DateTime(2026, 2, 15), 500m)
        };

        var result = TimeAndMaterialEconomicsCalculator.Calculate(project, new[] { workItem }, entries, payments);

        Assert.Equal(2, result.MonthlyRows.Count);
        Assert.Equal(-100m, result.MonthlyRows[0].CumulativeBalance);
        Assert.Equal(300m, result.MonthlyRows[1].CumulativeBalance);
    }
}
