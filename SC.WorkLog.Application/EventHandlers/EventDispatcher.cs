using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using SC.WorkLog.Domain.Interfaces;

namespace SC.WorkLog.Application.EventHandlers
{
    public class EventDispatcher : IEventDispatcher
    {
        private readonly IServiceProvider _serviceProvider;

        public EventDispatcher(IServiceProvider serviceProvider)
        {
            _serviceProvider = serviceProvider;
        }

        public async Task DispatchAsync(IEnumerable<IEvent> events)
        {
            foreach (var domainEvent in events)
            {
                var eventType = domainEvent.GetType();
                var handlerType = typeof(IEventHandler<>).MakeGenericType(eventType);
                var handler = _serviceProvider.GetService(handlerType);

                if (handler == null)
                    continue;

                var method = handlerType.GetMethod(nameof(IEventHandler<IEvent>.HandleAsync));
                var task = (Task)method.Invoke(handler, new object[] { domainEvent });
                await task;
            }
        }
    }
}
