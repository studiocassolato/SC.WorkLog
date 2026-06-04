using System;
using System.Collections.Generic;
using System.Linq;
using SC.WorkLog.Domain.AggregateRoots;

namespace SC.WorkLog.Domain.DomainServices
{
    internal static class WorkLogCalculationHelpers
    {
        public static List<TimeEntry> GetProjectTimeEntries(Project project, IEnumerable<WorkItem> workItems, IEnumerable<TimeEntry> timeEntries)
        {
            if (project == null)
                throw new ArgumentException("Project is required.");

            return (timeEntries ?? Enumerable.Empty<TimeEntry>())
                .Where(x => x.ProjectId == project.Id)
                .ToList();
        }

        public static DateTime GetMonth(DateTime value)
        {
            return new DateTime(value.Year, value.Month, 1);
        }

        public static List<DateTime> GetMonths(DateTime startDate, DateTime endDate)
        {
            var months = new List<DateTime>();
            var cursor = GetMonth(startDate);
            var end = GetMonth(endDate);

            while (cursor <= end)
            {
                months.Add(cursor);
                cursor = cursor.AddMonths(1);
            }

            return months;
        }
    }
}
