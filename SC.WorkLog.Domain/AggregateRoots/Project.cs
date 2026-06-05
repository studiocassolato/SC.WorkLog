using System;
using SC.WorkLog.Domain.DomainServices;
using SC.WorkLog.Domain.Enums;
using SC.WorkLog.Domain.ValueObjects;

namespace SC.WorkLog.Domain.AggregateRoots
{
    public class Project : AggregateRoot
    {
        public Guid CustomerId { get; private set; }
        public string Name { get; private set; }
        public ProjectPaymentType PaymentType { get; private set; }
        public ProjectStatus Status { get; private set; }
        public string Notes { get; private set; }
        public bool Active { get; private set; }
        public bool IsDefault { get; private set; }
        public decimal? JuniorRate { get; private set; }
        public decimal? MidRate { get; private set; }
        public decimal? SeniorRate { get; private set; }
        public decimal? FixedAmount { get; private set; }

        private Project()
        {
        }

        public Project(Guid customerId, string name, ProjectPaymentType paymentType, ProjectStatus status, string notes, decimal? juniorRate, decimal? midRate, decimal? seniorRate, decimal? fixedAmount, string currentUser, bool isDefault = false)
        {
            WorkLogDomainValidation.Required(customerId, nameof(CustomerId));
            WorkLogDomainValidation.Required(name, nameof(Name));
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));
            ValidatePaymentConfiguration(paymentType, juniorRate, midRate, seniorRate, fixedAmount);

            CustomerId = customerId;
            Name = name.Trim();
            PaymentType = paymentType;
            Status = status;
            Notes = notes;
            Active = status != ProjectStatus.Closed;
            IsDefault = isDefault;
            JuniorRate = juniorRate;
            MidRate = midRate;
            SeniorRate = seniorRate;
            FixedAmount = fixedAmount;
            AuditInfo = new AuditInfo(currentUser);
        }

        public void Update(Guid customerId, string name, ProjectPaymentType paymentType, ProjectStatus status, string notes, decimal? juniorRate, decimal? midRate, decimal? seniorRate, decimal? fixedAmount, string currentUser, bool isDefault = false)
        {
            WorkLogDomainValidation.Required(customerId, nameof(CustomerId));
            WorkLogDomainValidation.Required(name, nameof(Name));
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));
            ValidatePaymentConfiguration(paymentType, juniorRate, midRate, seniorRate, fixedAmount);

            CustomerId = customerId;
            Name = name.Trim();
            PaymentType = paymentType;
            Status = status;
            Notes = notes;
            Active = status != ProjectStatus.Closed;
            IsDefault = isDefault;
            JuniorRate = juniorRate;
            MidRate = midRate;
            SeniorRate = seniorRate;
            FixedAmount = fixedAmount;
            AuditInfo.Update(currentUser);
        }

        public void EnsureCanHavePayments()
        {
            if (PaymentType != ProjectPaymentType.TimeAndMaterial)
                throw new ArgumentException("ProjectPayment is meaningful only for Time & material projects.");
        }

        public void EnsureCanHaveContractPeriods()
        {
            if (PaymentType != ProjectPaymentType.AnnualRetainer)
                throw new ArgumentException("ProjectContractPeriod is meaningful only for Annual retainer projects.");
        }

        private static void ValidatePaymentConfiguration(ProjectPaymentType paymentType, decimal? juniorRate, decimal? midRate, decimal? seniorRate, decimal? fixedAmount)
        {
            if (paymentType == ProjectPaymentType.TimeAndMaterial)
            {
                WorkLogDomainValidation.Positive(juniorRate.GetValueOrDefault(), nameof(JuniorRate));
                WorkLogDomainValidation.Positive(midRate.GetValueOrDefault(), nameof(MidRate));
                WorkLogDomainValidation.Positive(seniorRate.GetValueOrDefault(), nameof(SeniorRate));
            }

            if (paymentType == ProjectPaymentType.FixedPrice)
                WorkLogDomainValidation.Positive(fixedAmount.GetValueOrDefault(), nameof(FixedAmount));
        }
    }
}
