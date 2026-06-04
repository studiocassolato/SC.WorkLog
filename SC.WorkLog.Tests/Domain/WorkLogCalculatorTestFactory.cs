using System;
using SC.WorkLog.Domain.AggregateRoots;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Tests.Domain;

internal static class WorkLogCalculatorTestFactory
{
    public const string CurrentUser = "unit-test";

    public static Employee Employee(decimal expectedDailyHours = 8m, decimal defaultRate = 50m)
    {
        return new Employee("Test", "Employee", "employee@example.com", EmployeeLevel.Senior, defaultRate, expectedDailyHours, CurrentUser);
    }

    public static Project Project(ProjectPaymentType paymentType, decimal fixedAmount = 1000m)
    {
        return new Project(
            Guid.NewGuid(),
            $"{paymentType} project",
            paymentType,
            ProjectStatus.Active,
            string.Empty,
            paymentType == ProjectPaymentType.TimeAndMaterial ? 50m : null,
            paymentType == ProjectPaymentType.TimeAndMaterial ? 75m : null,
            paymentType == ProjectPaymentType.TimeAndMaterial ? 100m : null,
            paymentType == ProjectPaymentType.FixedPrice ? fixedAmount : null,
            CurrentUser);
    }

    public static WorkItem WorkItem(Project project)
    {
        var status = new StatusConfig("new", "New", WorkItemStatusTypology.New, "New", 10, true, CurrentUser);
        return new WorkItem("WI-1", project.Id, "Work item", "Description", status.Key, WorkItemPriority.Normal, null, WorkItemOrigin.Manual, null, new DateTime(2026, 1, 1), false, CurrentUser);
    }

    public static TimeEntry TimeEntry(Employee employee, WorkItem workItem, DateTime date, decimal time, decimal approvedTime, decimal defaultRate = 50m, decimal projectRate = 100m)
    {
        return new TimeEntry(employee.Id, workItem.Id, date, time, approvedTime, "Work", null, RequestStatus.PendingApproval, null, employee.Level, defaultRate, projectRate, CurrentUser);
    }

    public static ProjectPayment ProjectPayment(Project project, DateTime paymentDate, decimal amount)
    {
        return new ProjectPayment(project.Id, paymentDate, amount, "Payment", CurrentUser);
    }

    public static ProjectContractPeriod ProjectContractPeriod(Project project, DateTime startDate, DateTime endDate, decimal amount)
    {
        return new ProjectContractPeriod(project.Id, startDate, endDate, amount, null, "Period", CurrentUser);
    }

    public static LeaveRequest ApprovedLeave(Employee employee, DateTime date, decimal hours)
    {
        var request = new LeaveRequest(employee.Id, LeaveRequestType.Permission, date, hours, "Leave", CurrentUser);
        request.Approve("Approved", CurrentUser);
        return request;
    }

    public static OvertimeRequest ApprovedOvertime(Employee employee, DateTime date, decimal hours)
    {
        var request = new OvertimeRequest(employee.Id, date, hours, CurrentUser);
        request.Approve(hours, "Approved", CurrentUser);
        return request;
    }
}
