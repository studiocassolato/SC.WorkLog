using System;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Application.DTO.TimeEntries
{
    public class TimeEntryListItemDto
    {
        public Guid Id { get; set; }
        public Guid EmployeeId { get; set; }
        public string EmployeeName { get; set; }
        public Guid WorkItemId { get; set; }
        public string WorkItemTitle { get; set; }
        public Guid ProjectId { get; set; }
        public string ProjectName { get; set; }
        public Guid CustomerId { get; set; }
        public string CustomerName { get; set; }
        public DateTime Date { get; set; }
        public decimal Time { get; set; }
        public decimal? ApprovedTime { get; set; }
        public string Description { get; set; }
        public string AdminNote { get; set; }
        public EmployeeLevel EmployeeLevelSnapshot { get; set; }
        public decimal? EmployeeDefaultRateSnapshot { get; set; }
        public decimal? ProjectRateSnapshot { get; set; }
        public decimal? CalculatedValue { get; set; }
    }
}
