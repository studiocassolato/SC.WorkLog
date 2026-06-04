using System;
using SC.WorkLog.Domain.Enums;

using System.Collections.Generic;
using SC.WorkLog.Application.DTO.TimeEntries;

namespace SC.WorkLog.Application.DTO.OvertimeRequests
{
    public class OvertimeRequestDto
    {
        public Guid Id { get; set; }
        public Guid EmployeeId { get; set; }
        public string EmployeeName { get; set; }
        public DateTime Date { get; set; }
        public decimal CalculatedHours { get; set; }
        public decimal ApprovedHours { get; set; }
        public RequestStatus Status { get; set; }
        public string AdminNote { get; set; }
        public List<TimeEntryListItemDto> DayTimeEntries { get; set; }
    }
}
