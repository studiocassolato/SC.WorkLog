using System;
using System.Text.RegularExpressions;
using SC.WorkLog.Domain.DomainServices;
using SC.WorkLog.Domain.Enums;
using SC.WorkLog.Domain.ValueObjects;

namespace SC.WorkLog.Domain.AggregateRoots
{
    public class StatusConfig : AggregateRoot
    {
        private static readonly Regex ValidKeyRegex = new Regex("^[a-z0-9]+(?:-[a-z0-9]+)*$", RegexOptions.Compiled);

        public string Key { get; private set; }
        public string Name { get; private set; }
        public WorkItemStatusTypology Typology { get; private set; }
        public string CustomerDisplayName { get; private set; }
        public bool Active { get; private set; }
        public int Order { get; private set; }

        private StatusConfig()
        {
        }

        public StatusConfig(string key, string name, WorkItemStatusTypology typology, string customerDisplayName, int order, bool active, string currentUser)
        {
            WorkLogDomainValidation.Required(key, nameof(Key));
            WorkLogDomainValidation.Required(name, nameof(Name));
            WorkLogDomainValidation.Required(customerDisplayName, nameof(CustomerDisplayName));
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));
            if (order < 0)
                throw new ArgumentException("Order must be greater than or equal to zero.", nameof(order));

            Key = NormalizeKey(key);
            ValidateKey(Key);
            Name = name.Trim();
            Typology = typology;
            CustomerDisplayName = customerDisplayName.Trim();
            Order = order;
            Active = active;
            AuditInfo = new AuditInfo(currentUser);
        }

        public void Update(string name, WorkItemStatusTypology typology, string customerDisplayName, int order, bool active, string currentUser)
        {
            WorkLogDomainValidation.Required(name, nameof(Name));
            WorkLogDomainValidation.Required(customerDisplayName, nameof(CustomerDisplayName));
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));
            if (order < 0)
                throw new ArgumentException("Order must be greater than or equal to zero.", nameof(order));

            Name = name.Trim();
            Typology = typology;
            CustomerDisplayName = customerDisplayName.Trim();
            Order = order;
            Active = active;
            AuditInfo.Update(currentUser);
        }

        public bool IsClosed()
        {
            return Typology == WorkItemStatusTypology.Closed || Typology == WorkItemStatusTypology.Archived;
        }

        public bool IsOpen()
        {
            return !IsClosed();
        }

        public bool IsWaitingForCustomer()
        {
            return Typology == WorkItemStatusTypology.WaitingCustomer;
        }

        public bool IsWaitingInternal()
        {
            return Typology == WorkItemStatusTypology.WaitingInternal;
        }

        public bool CanBeInitial()
        {
            return Active && Typology == WorkItemStatusTypology.New;
        }

        public static string NormalizeKey(string key)
        {
            WorkLogDomainValidation.Required(key, nameof(Key));
            return key.Trim().ToLowerInvariant();
        }

        public static void ValidateKey(string key)
        {
            WorkLogDomainValidation.Required(key, nameof(Key));
            if (!ValidKeyRegex.IsMatch(key))
                throw new ArgumentException("Key must be lowercase kebab-case and contain only lowercase letters, numbers and single hyphens.");
        }
    }
}
