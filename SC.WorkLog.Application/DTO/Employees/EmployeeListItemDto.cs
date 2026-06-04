using System;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Application.DTO.Employees
{
    public class EmployeeListItemDto
    {
        public Guid Id { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Email { get; set; }
        public EmployeeLevel Level { get; set; }
        public decimal DefaultHourlyRate { get; set; }
        public decimal ExpectedDailyHours { get; set; }
        public bool Active { get; set; }
    }
}
