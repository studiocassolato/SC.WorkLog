using System;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Application.DTO.Reports
{
    public class TimeCompletenessFilter
    {
        public Guid? EmployeeId { get; set; }
        public DateTime DateFrom { get; set; }
        public DateTime DateTo { get; set; }
        public DailyTimeCompletenessStatus? Status { get; set; }
    }
}
