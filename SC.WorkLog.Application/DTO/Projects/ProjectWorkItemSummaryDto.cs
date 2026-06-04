namespace SC.WorkLog.Application.DTO.Projects
{
    public class ProjectWorkItemSummaryDto
    {
        public int Total { get; set; }
        public int New { get; set; }
        public int InProgress { get; set; }
        public int WaitingInternal { get; set; }
        public int WaitingCustomer { get; set; }
        public int Closed { get; set; }
        public int Archived { get; set; }
        public int Unassigned { get; set; }
    }
}
