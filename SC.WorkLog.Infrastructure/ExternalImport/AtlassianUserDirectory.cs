using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace SC.WorkLog.Infrastructure.ExternalImport
{
    internal class AtlassianUserDirectory
    {
        private readonly Dictionary<string, AtlassianUserRecord> _recordsByAccountId;

        private AtlassianUserDirectory(Dictionary<string, AtlassianUserRecord> recordsByAccountId)
        {
            _recordsByAccountId = recordsByAccountId;
        }

        public static AtlassianUserDirectory Load(string csvPath)
        {
            var resolvedPath = ResolvePath(csvPath);
            if (string.IsNullOrWhiteSpace(resolvedPath))
                throw new ArgumentException("Atlassian users CSV path is required.");
            if (!File.Exists(resolvedPath))
                throw new FileNotFoundException("Atlassian users CSV file was not found.", resolvedPath);

            var records = File.ReadAllLines(resolvedPath)
                .Skip(1)
                .Select(ParseLine)
                .Where(x => x != null && !string.IsNullOrWhiteSpace(x.AccountId))
                .GroupBy(x => x.AccountId, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(x => x.Key, x => x.First(), StringComparer.OrdinalIgnoreCase);

            return new AtlassianUserDirectory(records);
        }

        public AtlassianUserRecord FindByAccountId(string accountId)
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

        private static AtlassianUserRecord ParseLine(string line)
        {
            if (string.IsNullOrWhiteSpace(line))
                return null;

            var columns = CsvUtilities.SplitCsvLine(line);
            if (columns.Count < 4)
                return null;

            return new AtlassianUserRecord
            {
                AccountId = columns[0],
                DisplayName = columns[1],
                Email = columns[2],
                Active = string.Equals(columns[3], "Active", StringComparison.OrdinalIgnoreCase)
            };
        }
    }

    internal class AtlassianUserRecord
    {
        public string AccountId { get; set; }
        public string DisplayName { get; set; }
        public string Email { get; set; }
        public bool Active { get; set; }
    }
}
