using System;
using SC.WorkLog.Application.DTO.Common;
using SC.WorkLog.Domain.Enums;

namespace SC.WorkLog.Application.Validation
{
    public static class WorkLogApplicationValidation
    {
        public static void Required(Guid value, string fieldName)
        {
            if (value == Guid.Empty)
                throw new ArgumentException($"{fieldName} is required.");
        }

        public static void Required(string value, string fieldName)
        {
            if (string.IsNullOrWhiteSpace(value))
                throw new ArgumentException($"{fieldName} is required.");
        }

        public static void Required(DateTime value, string fieldName)
        {
            if (value == default)
                throw new ArgumentException($"{fieldName} is required.");
        }

        public static void Positive(decimal value, string fieldName)
        {
            if (value <= 0)
                throw new ArgumentException($"{fieldName} must be greater than zero.");
        }

        public static void NonNegative(decimal value, string fieldName)
        {
            if (value < 0)
                throw new ArgumentException($"{fieldName} must be greater than or equal to zero.");
        }

        public static void HalfHourIncrement(decimal value, string fieldName)
        {
            Positive(value, fieldName);

            if (value * 2 != decimal.Truncate(value * 2))
                throw new ArgumentException($"{fieldName} must use 0.5 hour increments.");
        }

        public static void NonNegativeHalfHourIncrement(decimal value, string fieldName)
        {
            NonNegative(value, fieldName);

            if (value * 2 != decimal.Truncate(value * 2))
                throw new ArgumentException($"{fieldName} must use 0.5 hour increments.");
        }

        public static void ValidDateRange(DateTime startDate, DateTime endDate, string endDateFieldName)
        {
            if (endDate.Date < startDate.Date)
                throw new ArgumentException($"{endDateFieldName} must be greater than or equal to StartDate.");
        }

        public static void RequireAdmin(WorkLogUserContext userContext, string action)
        {
            if (userContext == null || !userContext.IsAdmin())
                throw new ArgumentException($"{action} requires Admin role.");
        }

        public static void RequireEmployeeSelfOrAdmin(Guid employeeId, WorkLogUserContext userContext, string action)
        {
            if (userContext == null)
                throw new ArgumentException($"{action} requires a user context.");

            if (!userContext.IsAdmin() && userContext.EmployeeId != employeeId)
                throw new ArgumentException($"{action} can only be performed by the employee or an Admin.");
        }

        public static void EnsureProjectPaymentAllowed(ProjectPaymentType paymentType)
        {
            if (paymentType != ProjectPaymentType.TimeAndMaterial)
                throw new ArgumentException("ProjectPayment is only valid for Time & material projects.");
        }

        public static void EnsureContractPeriodAllowed(ProjectPaymentType paymentType)
        {
            if (paymentType != ProjectPaymentType.AnnualRetainer)
                throw new ArgumentException("ProjectContractPeriod is only valid for Annual retainer projects.");
        }
    }
}
