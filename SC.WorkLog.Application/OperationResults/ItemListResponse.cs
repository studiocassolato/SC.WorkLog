using System.Collections.Generic;
using System.Linq;

namespace SC.WorkLog.Application.OperationResults
{
    public class ItemListResponse<T>
    {
        public ItemListResponse(IEnumerable<T> items)
        {
            Items = items?.ToList();
            RecordCount = items?.Count() ?? 0;
        }

        public List<T> Items { get; set; }
        public long RecordCount { get; set; }

        public ItemListResponse<T> WithCount(long count)
        {
            RecordCount = count;
            return this;
        }
    }
}
