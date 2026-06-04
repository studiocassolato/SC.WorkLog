using System;

namespace SC.WorkLog.Application.DTO.Projects
{
    public class ProjectMilestoneDto
    {
        public Guid Id { get; set; }
        public Guid ProjectId { get; set; }
        public string Title { get; set; }
        public DateTime Date { get; set; }
    }
}
