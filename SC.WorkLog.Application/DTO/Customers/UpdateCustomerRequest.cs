using System;

namespace SC.WorkLog.Application.DTO.Customers
{
    public class UpdateCustomerRequest
    {
        public Guid Id { get; set; }
        public string CompanyName { get; set; }
        public string CompanyDomain { get; set; }
        public string ContactPerson { get; set; }
        public string ContactEmail { get; set; }
        public string ContactPhone { get; set; }
        public bool Active { get; set; }
    }
}
