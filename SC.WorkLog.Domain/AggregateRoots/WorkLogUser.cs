using System;
using SC.WorkLog.Domain.DomainServices;
using SC.WorkLog.Domain.Enums;
using SC.WorkLog.Domain.ValueObjects;

namespace SC.WorkLog.Domain.AggregateRoots
{
    public class WorkLogUser : AggregateRoot
    {
        public string Email { get; private set; }
        public string CognitoSub { get; private set; }
        public WorkLogUserType UserType { get; private set; }
        public WorkLogUserRole Role { get; private set; }
        public Guid? EmployeeId { get; private set; }
        public Guid? CustomerId { get; private set; }
        public string DisplayName { get; private set; }
        public bool Active { get; private set; }

        private WorkLogUser()
        {
        }

        public WorkLogUser(string email, string cognitoSub, WorkLogUserType userType, WorkLogUserRole role, Guid? employeeId, Guid? customerId, string displayName, string currentUser)
        {
            WorkLogDomainValidation.Required(email, nameof(Email));
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));
            ValidateUserShape(userType, role, employeeId, customerId);

            Email = email.Trim();
            CognitoSub = cognitoSub?.Trim();
            UserType = userType;
            Role = role;
            EmployeeId = employeeId;
            CustomerId = customerId;
            DisplayName = displayName?.Trim();
            Active = true;
            AuditInfo = new AuditInfo(currentUser);
        }

        public void Update(string email, string cognitoSub, WorkLogUserType userType, WorkLogUserRole role, Guid? employeeId, Guid? customerId, string displayName, bool active, string currentUser)
        {
            WorkLogDomainValidation.Required(email, nameof(Email));
            WorkLogDomainValidation.Required(currentUser, nameof(currentUser));
            ValidateUserShape(userType, role, employeeId, customerId);

            Email = email.Trim();
            CognitoSub = cognitoSub?.Trim();
            UserType = userType;
            Role = role;
            EmployeeId = employeeId;
            CustomerId = customerId;
            DisplayName = displayName?.Trim();
            Active = active;
            AuditInfo.Update(currentUser);
        }

        private static void ValidateUserShape(WorkLogUserType userType, WorkLogUserRole role, Guid? employeeId, Guid? customerId)
        {
            if (userType == WorkLogUserType.Employee)
            {
                if (!employeeId.HasValue || employeeId.Value == Guid.Empty)
                    throw new ArgumentException("Employee users require EmployeeId.");

                if (customerId.HasValue)
                    throw new ArgumentException("Employee users must not have CustomerId.");

                if (role == WorkLogUserRole.Customer)
                    throw new ArgumentException("Customer role is valid only for Customer users.");
            }

            if (userType == WorkLogUserType.Customer)
            {
                if (!customerId.HasValue || customerId.Value == Guid.Empty)
                    throw new ArgumentException("Customer users require CustomerId.");

                if (employeeId.HasValue)
                    throw new ArgumentException("Customer users must not have EmployeeId.");

                if (role != WorkLogUserRole.Customer)
                    throw new ArgumentException("Customer users can only have Customer role.");
            }
        }
    }
}
