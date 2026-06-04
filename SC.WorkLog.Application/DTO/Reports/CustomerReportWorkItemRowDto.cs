using System;

namespace SC.WorkLog.Application.DTO.Reports
{
    public class CustomerReportWorkItemRowDto
    {
        public DateTime Date { get; set; }
        public Guid CustomerId { get; set; }
        public string CustomerName { get; set; }
        public Guid ProjectId { get; set; }
        public string ProjectName { get; set; }
        public Guid WorkItemId { get; set; }
        public string WorkItemTitle { get; set; }
        public decimal Hours { get; set; }
        public decimal ApprovedHours { get; set; }
        public string Description { get; set; }
    }
}
