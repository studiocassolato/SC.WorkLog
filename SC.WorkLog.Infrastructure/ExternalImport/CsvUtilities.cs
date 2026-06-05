using System.Collections.Generic;

namespace SC.WorkLog.Infrastructure.ExternalImport
{
    internal static class CsvUtilities
    {
        public static List<string> SplitCsvLine(string line)
        {
            var values = new List<string>();
            var current = new List<char>();
            var inQuotes = false;

            for (var i = 0; i < line.Length; i++)
            {
                var c = line[i];
                if (c == '"')
                {
                    if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                    {
                        current.Add('"');
                        i++;
                    }
                    else
                    {
                        inQuotes = !inQuotes;
                    }
                }
                else if (c == ',' && !inQuotes)
                {
                    values.Add(new string(current.ToArray()).Trim());
                    current.Clear();
                }
                else
                {
                    current.Add(c);
                }
            }

            values.Add(new string(current.ToArray()).Trim());
            return values;
        }
    }
}
