using System;

namespace SC.WorkLog.Application.DTO.Reports
{
    public class CustomerReportFilter
    {
        public Guid? CustomerId { get; set; }
        public Guid? ProjectId { get; set; }
        public DateTime DateFrom { get; set; }
        public DateTime DateTo { get; set; }
    }
}
