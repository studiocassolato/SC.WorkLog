using System.Collections.Generic;
using System.Threading.Tasks;

namespace SC.WorkLog.Domain.Interfaces
{
    public interface IEventDispatcher
    {
        Task DispatchAsync(IEnumerable<IEvent> events);
    }
}
