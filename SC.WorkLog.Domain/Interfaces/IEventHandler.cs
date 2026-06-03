using System.Threading.Tasks;

namespace SC.WorkLog.Domain.Interfaces
{
    public interface IEventHandler<TEvent> where TEvent : IEvent
    {
        Task HandleAsync(TEvent domainEvent);
    }
}
