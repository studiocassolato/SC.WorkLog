using System;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Application.DTO.TimeEntries
{
    public class UpdateTimeEntryRequest
    {
        public Guid Id { get; set; }
        public DateTime Date { get; set; }
        public decimal Time { get; set; }
        public string Description { get; set; }
        public string Notes { get; set; }
    }
}
