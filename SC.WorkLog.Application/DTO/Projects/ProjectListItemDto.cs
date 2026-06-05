using System;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Application.DTO.Projects
{
    public class ProjectListItemDto
    {
        public Guid Id { get; set; }
        public Guid CustomerId { get; set; }
        public string CustomerName { get; set; }
        public string Name { get; set; }
        public ProjectPaymentType? PaymentType { get; set; }
        public ProjectStatus Status { get; set; }
        public bool IsDefault { get; set; }
        public decimal LoggedHours { get; set; }
        public int WorkItemCount { get; set; }
        public int OpenWorkItemCount { get; set; }
    }
}
