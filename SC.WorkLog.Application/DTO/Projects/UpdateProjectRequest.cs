using System;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Application.DTO.Projects
{
    public class UpdateProjectRequest
    {
        public Guid Id { get; set; }
        public Guid CustomerId { get; set; }
        public string Name { get; set; }
        public ProjectPaymentType PaymentType { get; set; }
        public ProjectStatus Status { get; set; }
        public string Notes { get; set; }
        public decimal? JuniorRate { get; set; }
        public decimal? MidRate { get; set; }
        public decimal? SeniorRate { get; set; }
        public decimal? FixedAmount { get; set; }
    }
}
