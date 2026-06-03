namespace SC.WorkLog.Application.OperationResults
{
    public class ItemResponse<T>
    {
        public ItemResponse(T item)
        {
            Item = item;
        }

        public T Item { get; set; }
    }
}
