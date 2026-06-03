namespace SC.WorkLog.Domain.Interfaces
{
    public interface ICurrentUser
    {
        string UserName { get; }
        bool IsAuthenticated { get; }
    }
}
