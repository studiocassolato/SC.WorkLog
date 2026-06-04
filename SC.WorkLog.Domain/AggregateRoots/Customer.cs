using SC.WorkLog.Domain.DomainServices;
using SC.WorkLog.Domain.ValueObjects;

namespace SC.WorkLog.Domain.AggregateRoots
{
    public class Customer : AggregateRoot
    {
        public string CompanyName { get; private set; }
        public string CompanyDomain { get; private set; }
        public string ContactPerson { get; private set; }
        public string ContactEmail { get; private set; }
        public string ContactPhone { get; private set; }
        public bool Active { get; private set; }

        private Customer()
        {
        }

        public Customer(string companyName, string companyDomain, string contactPerson, string contactEmail, string contactPhone, string currentUser)
        {
            WorkLogDomainValidation.Required(companyName, nameof(CompanyName));
            WorkLogDomainValidation.Required(contactPerson, nameof(ContactPerson));
            WorkLogDomainValidation.Required(contactEmail, nameof(ContactEmail));
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));

            CompanyName = companyName.Trim();
            CompanyDomain = companyDomain?.Trim();
            ContactPerson = contactPerson.Trim();
            ContactEmail = contactEmail.Trim();
            ContactPhone = contactPhone?.Trim();
            Active = true;
            AuditInfo = new AuditInfo(currentUser);
        }

        public void Update(string companyName, string companyDomain, string contactPerson, string contactEmail, string contactPhone, bool active, string currentUser)
        {
            WorkLogDomainValidation.Required(companyName, nameof(CompanyName));
            WorkLogDomainValidation.Required(contactPerson, nameof(ContactPerson));
            WorkLogDomainValidation.Required(contactEmail, nameof(ContactEmail));
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));

            CompanyName = companyName.Trim();
            CompanyDomain = companyDomain?.Trim();
            ContactPerson = contactPerson.Trim();
            ContactEmail = contactEmail.Trim();
            ContactPhone = contactPhone?.Trim();
            Active = active;
            AuditInfo.Update(currentUser);
        }
    }
}
