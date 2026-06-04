using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Application.DTO.StatusConfigs
{
    public class CreateStatusConfigRequest
    {
        public string Key { get; set; }
        public string Name { get; set; }
        public WorkItemStatusTypology Typology { get; set; }
        public string CustomerDisplayName { get; set; }
        public int Order { get; set; }
        public bool Active { get; set; } = true;
    }
}
