using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace SC.WorkLog.Infrastructure.ExternalImport
{
    internal class PortalOnlyCustomerDirectory
    {
        private readonly Dictionary<string, PortalOnlyCustomerRecord> _recordsByAccountId;

        private PortalOnlyCustomerDirectory(Dictionary<string, PortalOnlyCustomerRecord> recordsByAccountId)
        {
            _recordsByAccountId = recordsByAccountId;
        }

        public static PortalOnlyCustomerDirectory Load(string csvPath)
        {
            var resolvedPath = ResolvePath(csvPath);
            if (string.IsNullOrWhiteSpace(resolvedPath))
                throw new ArgumentException("Portal-only customers CSV path is required.");
            if (!File.Exists(resolvedPath))
                throw new FileNotFoundException("Portal-only customers CSV file was not found.", resolvedPath);

            var records = File.ReadAllLines(resolvedPath)
                .Skip(1)
                .Select(ParseLine)
                .Where(x => x != null && !string.IsNullOrWhiteSpace(x.AccountId))
                .GroupBy(x => x.AccountId, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(x => x.Key, x => x.First(), StringComparer.OrdinalIgnoreCase);

            return new PortalOnlyCustomerDirectory(records);
        }

        public PortalOnlyCustomerRecord FindByAccountId(string accountId)
        {
            return !string.IsNullOrWhiteSpace(accountId) && _recordsByAccountId.TryGetValue(accountId, out var record)
                ? record
                : null;
        }

        private static string ResolvePath(string csvPath)
        {
            if (string.IsNullOrWhiteSpace(csvPath))
                return null;
            return Path.IsPathRooted(csvPath)
                ? csvPath
                : Path.Combine(AppContext.BaseDirectory, csvPath);
        }

        private static PortalOnlyCustomerRecord ParseLine(string line)
        {
            if (string.IsNullOrWhiteSpace(line))
                return null;

            var columns = CsvUtilities.SplitCsvLine(line);
            if (columns.Count < 5)
                return null;

            return new PortalOnlyCustomerRecord
            {
                AccountId = columns[0],
                FullName = columns[1],
                Email = columns[2],
                Active = string.Equals(columns[3], "Yes", StringComparison.OrdinalIgnoreCase),
                LastLogin = columns[4]
            };
        }

    }

    internal class PortalOnlyCustomerRecord
    {
        public string AccountId { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
        public bool Active { get; set; }
        public string LastLogin { get; set; }
    }
}
