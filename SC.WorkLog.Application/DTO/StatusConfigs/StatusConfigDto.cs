using System;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Application.DTO.StatusConfigs
{
    public class StatusConfigDto
    {
        public Guid Id { get; set; }
        public string Key { get; set; }
        public string Name { get; set; }
        public WorkItemStatusTypology Typology { get; set; }
        public string CustomerDisplayName { get; set; }
        public int Order { get; set; }
        public bool Active { get; set; }
        public bool IsClosed { get; set; }
    }
}
