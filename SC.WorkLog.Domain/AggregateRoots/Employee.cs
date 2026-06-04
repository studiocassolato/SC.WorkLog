using System;
using SC.WorkLog.Domain.DomainServices;
using SC.WorkLog.Domain.Enums;
using SC.WorkLog.Domain.ValueObjects;

namespace SC.WorkLog.Domain.AggregateRoots
{
    public class Employee : AggregateRoot
    {
        public string FirstName { get; private set; }
        public string LastName { get; private set; }
        public string Email { get; private set; }
        public EmployeeLevel Level { get; private set; }
        public decimal DefaultHourlyRate { get; private set; }
        public decimal ExpectedDailyHours { get; private set; }
        public bool Active { get; private set; }

        private Employee()
        {
        }

        public Employee(string firstName, string lastName, string email, EmployeeLevel level, decimal defaultHourlyRate, decimal expectedDailyHours, string currentUser)
        {
            WorkLogDomainValidation.Required(firstName, nameof(FirstName));
            WorkLogDomainValidation.Required(lastName, nameof(LastName));
            WorkLogDomainValidation.Required(email, nameof(Email));
            WorkLogDomainValidation.Positive(defaultHourlyRate, nameof(DefaultHourlyRate));
            WorkLogDomainValidation.HalfHourIncrement(expectedDailyHours, nameof(ExpectedDailyHours));
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));

            FirstName = firstName.Trim();
            LastName = lastName.Trim();
            Email = email.Trim();
            Level = level;
            DefaultHourlyRate = defaultHourlyRate;
            ExpectedDailyHours = expectedDailyHours;
            Active = true;
            AuditInfo = new AuditInfo(currentUser);
        }

        public void Update(string firstName, string lastName, string email, EmployeeLevel level, decimal defaultHourlyRate, decimal expectedDailyHours, bool active, string currentUser)
        {
            WorkLogDomainValidation.Required(firstName, nameof(FirstName));
            WorkLogDomainValidation.Required(lastName, nameof(LastName));
            WorkLogDomainValidation.Required(email, nameof(Email));
            WorkLogDomainValidation.Positive(defaultHourlyRate, nameof(DefaultHourlyRate));
            WorkLogDomainValidation.HalfHourIncrement(expectedDailyHours, nameof(ExpectedDailyHours));
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));

            FirstName = firstName.Trim();
            LastName = lastName.Trim();
            Email = email.Trim();
            Level = level;
            DefaultHourlyRate = defaultHourlyRate;
            ExpectedDailyHours = expectedDailyHours;
            Active = active;
            AuditInfo.Update(currentUser);
        }

    }
}
