using System;
using System.Collections.Generic;

namespace SC.WorkLog.Application.DTO.Reports
{
    public class TimeCompletenessDto
    {
        public DateTime DateFrom { get; set; }
        public DateTime DateTo { get; set; }
        public List<DailyTimeCompletenessRowDto> Rows { get; set; }
    }
}
