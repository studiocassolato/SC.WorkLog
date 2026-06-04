using System;

namespace SC.WorkLog.Application.DTO.Payments
{
    public class CreateProjectPaymentRequest
    {
        public Guid ProjectId { get; set; }
        public DateTime PaymentDate { get; set; }
        public decimal Amount { get; set; }
        public string Note { get; set; }
    }
}
