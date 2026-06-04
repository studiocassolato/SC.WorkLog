using System;

namespace SC.WorkLog.Application.DTO.Payments
{
    public class DeleteProjectPaymentRequest
    {
        public Guid ProjectId { get; set; }
        public Guid PaymentId { get; set; }
    }
}
