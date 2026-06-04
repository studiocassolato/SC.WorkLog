using System;

namespace SC.WorkLog.Application.DTO.Payments
{
    public class ProjectPaymentDto
    {
        public Guid Id { get; set; }
        public Guid ProjectId { get; set; }
        public DateTime PaymentDate { get; set; }
        public decimal Amount { get; set; }
        public string Note { get; set; }
        public DateTime CreatedOn { get; set; }
        public string CreatedBy { get; set; }
    }
}
