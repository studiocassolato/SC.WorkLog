using System.Collections.Generic;

namespace SC.WorkLog.Application.DTO.Reports
{
    public class InternalProjectEconomicsDto
    {
        public decimal ApprovedHours { get; set; }
        public decimal InternalValue { get; set; }
        public List<InternalValueByEmployeeDto> InternalValueByEmployee { get; set; }
        public List<MonthlyInternalValueDto> MonthlyInternalValue { get; set; }
    }
}
