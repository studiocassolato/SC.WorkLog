using System;
using System.Collections.Generic;

namespace SC.WorkLog.Application.DTO.Reports
{
    public class CustomerReportDto
    {
        public DateTime DateFrom { get; set; }
        public DateTime DateTo { get; set; }
        public Guid? CustomerId { get; set; }
        public decimal TotalHours { get; set; }
        public decimal ApprovedHours { get; set; }
        public decimal WorkedValue { get; set; }
        public List<CustomerReportWorkItemRowDto> Rows { get; set; }
    }
}
