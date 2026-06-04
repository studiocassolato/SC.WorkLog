using System;

namespace SC.WorkLog.Domain.DomainServices
{
    internal static class WorkLogDomainValidation
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

        public static void Positive(decimal value, string fieldName)
        {
            if (value <= 0)
                throw new ArgumentException($"{fieldName} must be greater than zero.");
        }

        public static void NonNegative(decimal value, string fieldName)
        {
            if (value < 0)
                throw new ArgumentException($"{fieldName} cannot be negative.");
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
    }
}
